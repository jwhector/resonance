import { ObservationSchema } from "@resonance/core";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { insertObservations } from "../queries/observations";
import { createTestDb, type TestDb } from "../testing/create-test-db";
import {
  PATTERN_CLASSIFICATION_METRICS,
  PATTERN_EVIDENCE_METRICS,
  PatternRecordInputSchema,
  weavePatternEvidence,
  weavePatterns,
} from "./weave-pattern";

/**
 * The pattern-registry record tables. Nothing writes them in this slice — the Evolution
 * Engine's Researcher and Architect are deferred (ADR-0020) — so these tests prove the shape
 * the registry's own documents describe survives a round trip, and that the link back to the
 * observations a pattern is built on is a real foreign key rather than a loose id.
 */

/** The registry's first authored pattern, in the shape this package stores it. */
function creatorUncertain() {
  return PatternRecordInputSchema.parse({
    patternId: "creator_uncertain",
    lifecycleStatus: "collecting_evidence",
    discoveredDuring: "flow_design",
    discoveredInFlows: ["emerging_creator_onboarding"],
    discoveredInStages: ["creator_name", "offering_expression", "origin"],
    currentScopeHypothesis: "cross_flow",
    observation:
      'Creators who say "I don\'t know" may be responding to a question that feels too broad rather than lacking a meaningful answer.',
    possibleSignals: ["creator says they do not know", "creator hesitates after a broad question"],
    candidateResponses: ["normalize_uncertainty", "reduce_question_scope", "allow_skip"],
    evidenceConfidence: "design_hypothesis",
    evidenceMetrics: { flow_count: 1, stage_count: 3 },
    candidatePromotions: ["conversation_heuristic"],
    classificationScores: {
      behavior_directness: 1,
      interpretation_uncertainty: 3,
      contextual_dependency: 3,
      violation_impact: 2,
      relationship_significance: 2,
      stability_over_time: 1,
    },
    classificationRationale: "Multiple interpretations remain possible.",
  });
}

describe("weave pattern registry records (PGlite)", () => {
  let db: TestDb;
  let close: () => Promise<void>;

  // Generous hookTimeout: PGlite WASM cold-init + migrations is ~1s in isolation but can exceed
  // the 10s default under parallel test-suite CPU contention in CI (seed resonance-75e5).
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
  }, 30000);
  afterEach(async () => {
    await close();
  });

  it("round-trips a pattern record with both metric maps intact", async () => {
    const [row] = await db.insert(weavePatterns).values(creatorUncertain()).returning();

    expect(row!.patternId).toBe("creator_uncertain");
    expect(row!.lifecycleStatus).toBe("collecting_evidence");
    expect(row!.discoveredInStages).toEqual(["creator_name", "offering_expression", "origin"]);
    // Every metric the registry names is present, defaulted to zero where nothing was observed.
    expect(Object.keys(row!.evidenceMetrics).sort()).toEqual([...PATTERN_EVIDENCE_METRICS].sort());
    expect(Object.keys(row!.classificationScores).sort()).toEqual(
      [...PATTERN_CLASSIFICATION_METRICS].sort(),
    );
    expect(row!.evidenceMetrics.stage_count).toBe(3);
    expect(row!.evidenceMetrics.supporting_case_count).toBe(0);
    expect(row!.classificationScores.interpretation_uncertainty).toBe(3);
    // A pattern starts un-promoted; nothing about it reaches a runtime prompt.
    expect(row!.promotionReadiness).toBe("not_ready");
    expect(row!.promotionDecision).toBe("pending");
    expect(row!.promotedId).toBeNull();
  });

  it("keeps one record per corpus pattern id", async () => {
    await db.insert(weavePatterns).values(creatorUncertain());
    await expect(db.insert(weavePatterns).values(creatorUncertain())).rejects.toThrow();
  });

  it("links evidence to the observation that justified it", async () => {
    const [pattern] = await db.insert(weavePatterns).values(creatorUncertain()).returning();
    const [supporting, contradicting] = await insertObservations(db, [
      ObservationSchema.parse({
        osReleaseId: "weave-os@1.4.0",
        conversationId: "conv_a",
        flowId: "emerging_creator_onboarding",
        stageId: "origin",
        category: "creator",
        signal: "creator_said_i_dont_know",
        evidenceSource: "simulated_creator_test",
        observedAt: new Date("2026-07-01T10:00:00Z"),
      }),
      ObservationSchema.parse({
        osReleaseId: "weave-os@1.4.0",
        conversationId: "conv_b",
        flowId: "emerging_creator_onboarding",
        stageId: null,
        category: "creator",
        signal: "creator_answered_immediately",
        evidenceSource: "simulated_creator_test",
        observedAt: new Date("2026-07-01T10:05:00Z"),
      }),
    ]);

    await db.insert(weavePatternEvidence).values([
      { patternId: pattern!.id, observationId: supporting!, stance: "supporting" },
      {
        patternId: pattern!.id,
        observationId: contradicting!,
        stance: "contradicting",
        note: "the question was equally broad and the creator answered anyway",
      },
    ]);

    const cited = await db
      .select()
      .from(weavePatternEvidence)
      .where(eq(weavePatternEvidence.patternId, pattern!.id));
    expect(cited).toHaveLength(2);
    expect(cited.map((c) => c.stance).sort()).toEqual(["contradicting", "supporting"]);
  });

  it("refuses evidence pointing at an observation that does not exist", async () => {
    const [pattern] = await db.insert(weavePatterns).values(creatorUncertain()).returning();

    await expect(
      db.insert(weavePatternEvidence).values({
        patternId: pattern!.id,
        observationId: crypto.randomUUID(),
        stance: "supporting",
      }),
    ).rejects.toThrow();
  });

  it("counts one observation once per pattern", async () => {
    const [pattern] = await db.insert(weavePatterns).values(creatorUncertain()).returning();
    const [observationId] = await insertObservations(db, [
      ObservationSchema.parse({
        osReleaseId: "weave-os@1.4.0",
        conversationId: "conv_a",
        flowId: "emerging_creator_onboarding",
        stageId: "origin",
        category: "creator",
        signal: "creator_said_i_dont_know",
        evidenceSource: "simulated_creator_test",
        observedAt: new Date("2026-07-01T10:00:00Z"),
      }),
    ]);

    const cite = {
      patternId: pattern!.id,
      observationId: observationId!,
      stance: "supporting" as const,
    };
    await db.insert(weavePatternEvidence).values(cite);
    // Re-importing the same evidence must not inflate the supporting-case count.
    await expect(db.insert(weavePatternEvidence).values(cite)).rejects.toThrow();
  });
});
