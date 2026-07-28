import {
  EvaluationSchema,
  ObservationSchema,
  ResonanceError,
  SCORED_DIMENSIONS,
  SCORED_DIMENSION_COUNT,
  type Evaluation,
  type Observation,
} from "@resonance/core";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createObservationAdapter } from "../adapters/observation-adapter";
import {
  weaveEvaluations,
  weaveEvaluationScores,
  weaveLimitationVerdicts,
  weaveObservations,
} from "../schema/weave-observation";
import { createTestDb, type TestDb } from "../testing/create-test-db";

/**
 * The `ObservationPort` interface contract, invariant by invariant, against real Postgres
 * (PGlite). The interface is the test surface: everything here goes through the same seam the
 * conversation runtime and the evolution harness will, so a change that satisfies these tests
 * satisfies callers.
 */

const RELEASE = "weave-os@1.4.0+ab12cd";
const OTHER_RELEASE = "weave-os@1.5.0+ef34gh";

/** A valid observation, parsed through the schema exactly as a real producer would. */
function observation(overrides: Partial<Observation> = {}): Observation {
  return ObservationSchema.parse({
    osReleaseId: RELEASE,
    conversationId: "conv_1",
    flowId: "emerging_creator_onboarding",
    stageId: "creator_name",
    category: "creator",
    signal: "skipped_question",
    evidenceSource: "simulated_creator_test",
    observedAt: new Date("2026-07-01T10:00:00Z"),
    ...overrides,
  });
}

/** A complete evaluation: all sixteen dimensions, as `EvaluationSchema` requires. */
function evaluation(overrides: Partial<Evaluation> = {}): Evaluation {
  return EvaluationSchema.parse({
    osReleaseId: RELEASE,
    conversationId: "conv_1",
    flowId: "emerging_creator_onboarding",
    evidenceSource: "simulated_creator_test",
    scores: SCORED_DIMENSIONS.map((dimension, i) => ({
      dimension,
      score: i % 4,
      rationale: `because ${dimension}`,
    })),
    limitationVerdicts: [],
    evaluatedAt: new Date("2026-07-01T11:00:00Z"),
    ...overrides,
  });
}

describe("createObservationAdapter — the ObservationPort contract", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  let port: ReturnType<typeof createObservationAdapter>;

  // Generous hookTimeout: PGlite WASM cold-init + migrations is ~1s in isolation but can exceed
  // the 10s default under parallel test-suite CPU contention in CI (seed resonance-75e5).
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    port = createObservationAdapter({ db });
  }, 30000);
  afterEach(async () => {
    await close();
  });

  // ── Invariant 3: one id per observation, in the order supplied ──────────────────────────
  it("returns one id per observation, in the order they were supplied", async () => {
    const batch = [
      observation({ signal: "first" }),
      observation({ signal: "second" }),
      observation({ signal: "third" }),
    ];

    const ids = await port.recordObservations(batch);

    expect(ids).toHaveLength(3);
    expect(new Set(ids).size).toBe(3);
    const stored = await Promise.all(
      ids.map(async (id) => {
        const [row] = await db.select().from(weaveObservations).where(eq(weaveObservations.id, id));
        return row?.signal;
      }),
    );
    expect(stored).toEqual(["first", "second", "third"]);
  });

  it("stores every field the observation carried", async () => {
    const [id] = await port.recordObservations([
      observation({ detail: "creator said 'skip this one'", category: "relationship" }),
    ]);

    const [row] = await db.select().from(weaveObservations).where(eq(weaveObservations.id, id!));

    expect(row).toMatchObject({
      osReleaseId: RELEASE,
      conversationId: "conv_1",
      flowId: "emerging_creator_onboarding",
      stageId: "creator_name",
      category: "relationship",
      signal: "skipped_question",
      detail: "creator said 'skip this one'",
      evidenceSource: "simulated_creator_test",
    });
    expect(row!.observedAt.toISOString()).toBe("2026-07-01T10:00:00.000Z");
  });

  it("keeps a null stage distinguishable from a stage that was recorded", async () => {
    const ids = await port.recordObservations([
      observation({ stageId: null }),
      observation({ stageId: "origin" }),
    ]);

    const rows = await Promise.all(
      ids.map(async (id) => {
        const [row] = await db.select().from(weaveObservations).where(eq(weaveObservations.id, id));
        return row!.stageId;
      }),
    );
    expect(rows).toEqual([null, "origin"]);
  });

  // ── Invariant 4: an empty batch is a no-op, not an error ────────────────────────────────
  it("treats an empty batch as a no-op returning no ids", async () => {
    await expect(port.recordObservations([])).resolves.toEqual([]);
    expect(await db.select().from(weaveObservations)).toHaveLength(0);
  });

  // ── Invariant 2: the batch is atomic ────────────────────────────────────────────────────
  it("writes nothing at all when one observation in the batch fails", async () => {
    // A producer that bypassed ObservationSchema: the third row violates NOT NULL. The whole
    // batch is one INSERT statement, so the two good rows must not survive it.
    const poisoned = {
      ...observation({ signal: "third" }),
      conversationId: null as unknown as string,
    };

    await expect(
      port.recordObservations([
        observation({ signal: "first" }),
        observation({ signal: "second" }),
        poisoned,
      ]),
    ).rejects.toThrow();

    expect(await db.select().from(weaveObservations)).toHaveLength(0);
  });

  // ── Invariant 5: the OS release is stored, never substituted ────────────────────────────
  it("stores the release each observation was given, even when a batch spans two", async () => {
    const ids = await port.recordObservations([
      observation({ osReleaseId: RELEASE }),
      observation({ osReleaseId: OTHER_RELEASE }),
    ]);

    const releases = await Promise.all(
      ids.map(async (id) => {
        const [row] = await db.select().from(weaveObservations).where(eq(weaveObservations.id, id));
        return row!.osReleaseId;
      }),
    );
    // An interview that spans a release boundary stays attributable to the corpus that ran it,
    // so the adapter must not normalise these to one "current" release.
    expect(releases).toEqual([RELEASE, OTHER_RELEASE]);
  });

  it("rejects an observation with no release rather than defaulting one", async () => {
    const unattributable = { ...observation(), osReleaseId: "   " };

    await expect(port.recordObservations([unattributable])).rejects.toBeInstanceOf(ResonanceError);
    await expect(port.recordObservations([unattributable])).rejects.toMatchObject({
      code: "observation_release_missing",
    });
    expect(await db.select().from(weaveObservations)).toHaveLength(0);
  });

  it("rejects the whole batch when only one observation is unattributable", async () => {
    await expect(
      port.recordObservations([observation(), { ...observation(), osReleaseId: "" }]),
    ).rejects.toBeInstanceOf(ResonanceError);

    expect(await db.select().from(weaveObservations)).toHaveLength(0);
  });

  it("rejects an evaluation with no release rather than defaulting one", async () => {
    await expect(port.recordEvaluation({ ...evaluation(), osReleaseId: "" })).rejects.toMatchObject(
      { code: "observation_release_missing" },
    );

    expect(await db.select().from(weaveEvaluations)).toHaveLength(0);
  });

  // ── Invariant 7: an evaluation lands whole, with all sixteen scores ─────────────────────
  it("stores all sixteen scores and every limitation verdict in one write", async () => {
    const id = await port.recordEvaluation(
      evaluation({
        limitationVerdicts: [
          { limitationId: "never_fabricate_experiences", held: true },
          {
            limitationId: "never_impose_identity",
            held: false,
            evidence: "described the creator in absolute terms",
          },
        ],
      }),
    );

    const [row] = await db.select().from(weaveEvaluations).where(eq(weaveEvaluations.id, id));
    expect(row).toMatchObject({
      osReleaseId: RELEASE,
      conversationId: "conv_1",
      flowId: "emerging_creator_onboarding",
      evidenceSource: "simulated_creator_test",
    });

    const scores = await db
      .select()
      .from(weaveEvaluationScores)
      .where(eq(weaveEvaluationScores.evaluationId, id));
    expect(scores).toHaveLength(SCORED_DIMENSION_COUNT);
    expect(scores).toHaveLength(16);
    expect(new Set(scores.map((s) => s.dimension))).toEqual(new Set(SCORED_DIMENSIONS));

    const verdicts = await db
      .select()
      .from(weaveLimitationVerdicts)
      .where(eq(weaveLimitationVerdicts.evaluationId, id));
    expect(verdicts).toHaveLength(2);
    // A limitation is boolean and lives in its own table, so a breach can never be averaged
    // against the sixteen scores.
    expect(verdicts.find((v) => v.limitationId === "never_impose_identity")).toMatchObject({
      held: false,
      evidence: "described the creator in absolute terms",
    });
  });

  it("stores an evaluation that breached nothing, with no verdict rows", async () => {
    const id = await port.recordEvaluation(evaluation());

    expect(await db.select().from(weaveEvaluations)).toHaveLength(1);
    expect(
      await db
        .select()
        .from(weaveEvaluationScores)
        .where(eq(weaveEvaluationScores.evaluationId, id)),
    ).toHaveLength(16);
    expect(await db.select().from(weaveLimitationVerdicts)).toHaveLength(0);
  });

  it("writes neither the evaluation nor a single score when one score is invalid", async () => {
    // Bypassing EvaluationSchema, which would have caught the out-of-range score. The database
    // is the second line: the CHECK fails, and the evaluation row inserted in the same
    // statement must go with it.
    const invalid = evaluation();
    const broken = {
      ...invalid,
      scores: invalid.scores.map((s, i) => (i === 5 ? { ...s, score: 9 } : s)),
    } as Evaluation;

    await expect(port.recordEvaluation(broken)).rejects.toThrow();

    expect(await db.select().from(weaveEvaluations)).toHaveLength(0);
    expect(await db.select().from(weaveEvaluationScores)).toHaveLength(0);
  });

  it("writes nothing when a limitation verdict fails, not an evaluation missing its verdicts", async () => {
    const broken = evaluation({
      limitationVerdicts: [
        { limitationId: "never_fabricate_experiences", held: true },
        { limitationId: "never_fabricate_experiences", held: false },
      ],
    });

    await expect(port.recordEvaluation(broken)).rejects.toThrow();

    expect(await db.select().from(weaveEvaluations)).toHaveLength(0);
    expect(await db.select().from(weaveEvaluationScores)).toHaveLength(0);
    expect(await db.select().from(weaveLimitationVerdicts)).toHaveLength(0);
  });

  // ── Invariant 6: writes are append-only ─────────────────────────────────────────────────
  it("records a re-scored conversation as a second evaluation, leaving the first intact", async () => {
    const first = await port.recordEvaluation(evaluation());
    const second = await port.recordEvaluation(
      evaluation({
        osReleaseId: OTHER_RELEASE,
        scores: SCORED_DIMENSIONS.map((dimension) => ({ dimension, score: 3 })),
      }),
    );

    expect(second).not.toBe(first);
    const rows = await db
      .select()
      .from(weaveEvaluations)
      .where(eq(weaveEvaluations.conversationId, "conv_1"));
    // Disagreement between two scorings of one conversation stays visible.
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.osReleaseId))).toEqual(new Set([RELEASE, OTHER_RELEASE]));
    expect(await db.select().from(weaveEvaluationScores)).toHaveLength(32);
  });

  it("keeps a score's rationale when one was given, and null when it was not", async () => {
    const withNone = evaluation({
      scores: SCORED_DIMENSIONS.map((dimension) => ({ dimension, score: 1 })),
    });
    const id = await port.recordEvaluation(withNone);

    const scores = await db
      .select()
      .from(weaveEvaluationScores)
      .where(eq(weaveEvaluationScores.evaluationId, id));
    expect(scores.every((s) => s.rationale === null)).toBe(true);
  });
});
