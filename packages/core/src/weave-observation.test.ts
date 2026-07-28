import { describe, expect, it } from "vitest";
import { SCORED_DIMENSIONS } from "./weave-evaluation";
import {
  EVIDENCE_SOURCES,
  EvaluationSchema,
  LimitationVerdictSchema,
  OBSERVATION_CATEGORIES,
  ObservationCategorySchema,
  ObservationSchema,
  type Evaluation,
  type Observation,
  type ObservationPort,
} from "./weave-observation";

// ---------------------------------------------------------------------------
// A second adapter at the seam.
//
// This is the acceptance proof that evidence capture is swappable: a complete
// ObservationPort implementation with no database and no SQL — just two in-memory arrays.
// It exists to be driven *through the interface*, exactly as `@resonance/db`'s adapter
// will be, and it implements the documented invariants (atomicity, id-per-observation in
// order, empty batch as a no-op, append-only, release id stored as given) rather than only
// the type signature. If a live adapter cannot be substituted here, the seam is in the
// wrong place.
// ---------------------------------------------------------------------------

type FakeStore = {
  readonly port: ObservationPort;
  readonly observations: Observation[];
  readonly evaluations: Evaluation[];
};

function createFakeObservationPort(options: { failOn?: string } = {}): FakeStore {
  const observations: Observation[] = [];
  const evaluations: Evaluation[] = [];
  let nextId = 1;

  const port: ObservationPort = {
    recordObservations(batch) {
      // Invariant 2: atomic — validate the whole batch before storing any of it.
      if (options.failOn !== undefined && batch.some((o) => o.signal === options.failOn)) {
        return Promise.reject(new Error("write failed"));
      }
      // Invariants 3 and 5: one id per observation in order, release id stored as given.
      const ids = batch.map((observation) => {
        observations.push(observation);
        return `obs_${nextId++}`;
      });
      return Promise.resolve(ids);
    },
    recordEvaluation(evaluation) {
      evaluations.push(evaluation);
      return Promise.resolve(`eval_${evaluations.length}`);
    },
  };

  return { port, observations, evaluations };
}

const RELEASE = "weave-os@2026-07-27.a1b2c3";
const OBSERVED_AT = new Date("2026-07-27T12:00:00.000Z");

const observation = (overrides: Partial<Observation> = {}): Observation =>
  ObservationSchema.parse({
    osReleaseId: RELEASE,
    conversationId: "conv_1",
    flowId: "emerging_creator_onboarding",
    stageId: "origin",
    category: "creator",
    signal: "skipped_question",
    evidenceSource: "simulated_creator_test",
    observedAt: OBSERVED_AT,
    ...overrides,
  });

const fullScores = SCORED_DIMENSIONS.map((dimension) => ({ dimension, score: 2 }));

const evaluation = (overrides: Partial<Evaluation> = {}): Evaluation =>
  EvaluationSchema.parse({
    osReleaseId: RELEASE,
    conversationId: "conv_1",
    flowId: "emerging_creator_onboarding",
    evidenceSource: "simulated_creator_test",
    scores: fullScores,
    evaluatedAt: OBSERVED_AT,
    ...overrides,
  });

describe("ObservationSchema", () => {
  it("requires an OS release id — evidence is meaningless without the corpus that produced it", () => {
    const { osReleaseId: _omitted, ...withoutRelease } = observation();
    expect(() => ObservationSchema.parse(withoutRelease)).toThrow();
    expect(() => ObservationSchema.parse({ ...observation(), osReleaseId: "" })).toThrow();
  });

  it("separates what the creator did, what Weave did, and what happened between them", () => {
    expect(ObservationCategorySchema.options).toEqual(["creator", "weave", "relationship"]);
    for (const category of OBSERVATION_CATEGORIES) {
      expect(ObservationSchema.parse({ ...observation(), category }).category).toBe(category);
    }
  });

  it("distinguishes 'outside any stage' from 'stage not recorded'", () => {
    expect(ObservationSchema.parse({ ...observation(), stageId: null }).stageId).toBeNull();
    // Nullable, not optional: omitting the field is not a way to avoid the question.
    const { stageId: _omitted, ...withoutStage } = observation();
    expect(() => ObservationSchema.parse(withoutStage)).toThrow();
  });

  it("leaves the signal vocabulary open, because each flow declares its own", () => {
    expect(
      ObservationSchema.parse({ ...observation(), signal: "creator_restored_original_version" }),
    ).toBeTruthy();
    expect(() => ObservationSchema.parse({ ...observation(), signal: "" })).toThrow();
  });

  it("records where the evidence came from, across the simulated-to-production range", () => {
    for (const evidenceSource of EVIDENCE_SOURCES) {
      expect(ObservationSchema.parse({ ...observation(), evidenceSource }).evidenceSource).toBe(
        evidenceSource,
      );
    }
    expect(() =>
      ObservationSchema.parse({ ...observation(), evidenceSource: "a_hunch" }),
    ).toThrow();
  });
});

describe("EvaluationSchema", () => {
  it("requires all sixteen dimensions, so a missing one is never mistaken for a bad one", () => {
    expect(evaluation().scores).toHaveLength(16);
    expect(() =>
      EvaluationSchema.parse({ ...evaluation(), scores: fullScores.slice(0, 15) }),
    ).toThrow(/missing 1 dimension/);
  });

  it("names every dimension a partial evaluation left out", () => {
    const result = EvaluationSchema.safeParse({
      ...evaluation(),
      scores: fullScores.filter((s) => s.dimension !== "safety" && s.dimension !== "clarity"),
    });
    expect(result.success).toBe(false);
    const message = result.success ? "" : (result.error.issues[0]?.message ?? "");
    expect(message).toContain("clarity");
    expect(message).toContain("safety");
  });

  it("rejects a dimension scored twice", () => {
    const first = fullScores[0];
    if (first === undefined) throw new Error("unreachable");
    expect(() =>
      EvaluationSchema.parse({ ...evaluation(), scores: [...fullScores, first] }),
    ).toThrow(/only once/);
  });

  it("records a limitation as held-or-breached, never as a score", () => {
    const verdict = LimitationVerdictSchema.parse({
      limitationId: "fabricate_experiences",
      held: false,
      evidence: "Invented a customer story the creator never described.",
    });
    expect(verdict.held).toBe(false);
    expect(Object.keys(LimitationVerdictSchema.shape)).not.toContain("score");
    // A breach is never a scored dimension, so it cannot be averaged away.
    expect(SCORED_DIMENSIONS).not.toContain("fabricate_experiences");
  });

  it("defaults limitation verdicts to empty so an evaluation need not assert them", () => {
    expect(evaluation().limitationVerdicts).toEqual([]);
    expect(
      evaluation({ limitationVerdicts: [{ limitationId: "remove_creator_agency", held: true }] })
        .limitationVerdicts,
    ).toHaveLength(1);
  });
});

describe("ObservationPort (driven purely through the interface)", () => {
  it("returns one id per observation, in the order supplied", async () => {
    const { port, observations } = createFakeObservationPort();
    const batch = [
      observation({ signal: "skipped_question" }),
      observation({ signal: "rejected_output" }),
      observation({ signal: "creator_accepted_summary", category: "relationship" }),
    ];

    const ids = await port.recordObservations(batch);

    expect(ids).toHaveLength(batch.length);
    expect(new Set(ids).size).toBe(batch.length);
    expect(observations.map((o) => o.signal)).toEqual(batch.map((o) => o.signal));
  });

  it("treats an empty batch as a no-op rather than an error", async () => {
    const { port, observations } = createFakeObservationPort();
    await expect(port.recordObservations([])).resolves.toEqual([]);
    expect(observations).toEqual([]);
  });

  it("writes a whole batch or none of it", async () => {
    const { port, observations } = createFakeObservationPort({ failOn: "rejected_output" });
    await expect(
      port.recordObservations([observation(), observation({ signal: "rejected_output" })]),
    ).rejects.toThrow();
    expect(observations).toEqual([]);
  });

  it("stores the release id it was given and never substitutes a current one", async () => {
    const { port, observations } = createFakeObservationPort();
    const older = "weave-os@2026-07-01.000000";

    await port.recordObservations([observation({ osReleaseId: older })]);
    await port.recordObservations([observation()]);

    expect(observations.map((o) => o.osReleaseId)).toEqual([older, RELEASE]);
  });

  it("keeps an in-flight conversation attributable to the release it was pinned to", async () => {
    const { port, observations, evaluations } = createFakeObservationPort();
    const pinned = "weave-os@2026-07-01.000000";

    // The corpus ships a new release mid-conversation; the pinned id travels with the run.
    await port.recordObservations([
      observation({ osReleaseId: pinned, stageId: "opening" }),
      observation({ osReleaseId: pinned, stageId: "origin" }),
    ]);
    await port.recordEvaluation(evaluation({ osReleaseId: pinned }));

    expect(new Set(observations.map((o) => o.osReleaseId))).toEqual(new Set([pinned]));
    expect(evaluations[0]?.osReleaseId).toBe(pinned);
  });

  it("stores an evaluation's sixteen scores and its limitation verdicts together", async () => {
    const { port, evaluations } = createFakeObservationPort();

    const id = await port.recordEvaluation(
      evaluation({ limitationVerdicts: [{ limitationId: "manipulate_emotions", held: true }] }),
    );

    expect(id).toBeTruthy();
    expect(evaluations[0]?.scores).toHaveLength(16);
    expect(evaluations[0]?.limitationVerdicts).toHaveLength(1);
  });

  it("is append-only: re-scoring a conversation adds an evaluation instead of replacing one", async () => {
    const { port, evaluations } = createFakeObservationPort();

    await port.recordEvaluation(evaluation());
    await port.recordEvaluation(
      evaluation({
        scores: SCORED_DIMENSIONS.map((dimension) => ({ dimension, score: 3 })),
        evidenceSource: "regression_suite",
      }),
    );

    expect(evaluations).toHaveLength(2);
    expect(evaluations.map((e) => e.evidenceSource)).toEqual([
      "simulated_creator_test",
      "regression_suite",
    ]);
    // The disagreement stays visible — neither scoring overwrote the other.
    expect(evaluations[0]?.scores[0]?.score).not.toBe(evaluations[1]?.scores[0]?.score);
  });

  it("is swappable: a production adapter substitutes with no change at the call site", async () => {
    const simulated = createFakeObservationPort();
    const production = createFakeObservationPort();

    // The call site is byte-identical for both; only the evidence source differs.
    const runConversation = (
      port: ObservationPort,
      evidenceSource: Observation["evidenceSource"],
    ) =>
      port.recordObservations([
        observation({ evidenceSource }),
        observation({ evidenceSource, signal: "interview_completed", category: "weave" }),
      ]);

    await runConversation(simulated.port, "simulated_creator_test");
    await runConversation(production.port, "production_conversation");

    expect(simulated.observations).toHaveLength(2);
    expect(production.observations.map((o) => o.evidenceSource)).toEqual([
      "production_conversation",
      "production_conversation",
    ]);
  });
});
