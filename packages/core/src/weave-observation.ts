import { z } from "zod";
import { ScoredDimensionSchema, ScoreSchema, SCORED_DIMENSIONS } from "./weave-evaluation";
import { CorpusIdSchema, OsReleaseIdSchema } from "./weave-os";

/**
 * The observation contract — the **evidence-capture seam**.
 *
 * ## The module
 *
 * `ObservationPort` is a two-method **interface** at the `@resonance/core` **seam**. Behind
 * it sits a large **implementation** owned by `@resonance/db`: batch insert of observation
 * rows, insert of an evaluation with its sixteen score rows and its limitation verdicts,
 * all in one transaction, all keyed to the OS release that produced them. None of that
 * leaks through the interface. Callers learn two methods and three data shapes; they get
 * durable, attributable evidence.
 *
 * ## Why the contract lives here and not in `db`
 *
 * Three packages must agree on the same evidence shapes: the evolution harness produces
 * observations from simulated runs, `@resonance/ai` produces them from real conversations,
 * and `@resonance/db` stores them. `core` is the only package all three may depend on
 * (ADR-0003) — which is also what makes "simulated now, production later" an adapter swap
 * rather than a rewrite.
 *
 * ## Why every record carries an OS release id
 *
 * Evidence is only meaningful against the behaviour that produced it. An observation
 * without a release id says a conversation went badly without saying which corpus said it,
 * which makes it useless for deciding whether a change improved anything. The release is
 * pinned once at the start of a conversation and stamped on every record from it, so an
 * interview that spans a release boundary stays attributable to the corpus it actually ran
 * under.
 *
 * ## Deletion test
 *
 * Delete this module and the harness, `ai`, and `db` each invent an evidence shape.
 * Simulated and production evidence would stop being comparable — which is the whole
 * purpose of collecting either — and swapping a simulated source for a live one would mean
 * rewriting every producer rather than substituting one adapter.
 *
 * ## Adapters at this seam
 *
 * Two, so the seam is real rather than hypothetical: the `@resonance/db` adapter, and the
 * in-test fake in `weave-observation.test.ts` that exercises the whole contract without a
 * database.
 *
 * @see ./discovery.ts — the same construction, for ranking
 * @see docs/adr/0017-design-deep-modules.md
 */

/**
 * What an observation is about.
 *
 * Three categories, because the corpus separates them and they answer different questions:
 * what the creator did, what Weave did, and what happened between them. Relationship
 * signals — trust, agency, whether clarity emerged without pressure — are not derivable
 * from either side alone, so they are not a sub-case of the other two.
 */
export const OBSERVATION_CATEGORIES = ["creator", "weave", "relationship"] as const;
export const ObservationCategorySchema = z.enum(OBSERVATION_CATEGORIES);
export type ObservationCategory = z.infer<typeof ObservationCategorySchema>;

/**
 * Where a piece of evidence came from.
 *
 * Carried rather than collapsed into a reliability grade: how much a source is worth is a
 * researcher's judgement that changes as the engine matures, whereas where an observation
 * came from is a fact recorded at capture time and never revised.
 */
export const EVIDENCE_SOURCES = [
  "design_hypothesis",
  "simulated_creator_test",
  "internal_human_test",
  "moderated_creator_research",
  "production_conversation",
  "regression_suite",
] as const;
export const EvidenceSourceSchema = z.enum(EVIDENCE_SOURCES);
export type EvidenceSource = z.infer<typeof EvidenceSourceSchema>;

/**
 * One recorded moment of evidence from a conversation.
 *
 * `signal` names what was observed using the flow's own `evaluationSignals` vocabulary
 * (`skipped_question`, `creator_corrected_interpretation`, …). The vocabulary is authored
 * per flow, so it is an open string here and is checked against the flow by
 * `@resonance/weave-os`; closing it in `core` would mean a flow could not declare a signal
 * without editing the shared vocabulary.
 *
 * `stageId` is nullable rather than optional: a conversation genuinely can produce evidence
 * outside any stage, and "not in a stage" must be distinguishable from "nobody recorded
 * which stage".
 */
export const ObservationSchema = z.object({
  osReleaseId: OsReleaseIdSchema,
  /** The conversation this came from. Opaque to this seam; the producer supplies it. */
  conversationId: z.string().min(1),
  flowId: CorpusIdSchema,
  stageId: CorpusIdSchema.nullable(),
  category: ObservationCategorySchema,
  signal: z.string().min(1),
  /** What was actually said or done, when the signal alone is not enough to act on. */
  detail: z.string().min(1).optional(),
  evidenceSource: EvidenceSourceSchema,
  observedAt: z.date(),
});
export type Observation = z.infer<typeof ObservationSchema>;

/** One dimension's score, with the reasoning that produced it. */
export const EvaluationScoreSchema = z.object({
  dimension: ScoredDimensionSchema,
  score: ScoreSchema,
  /** Why this score. Optional, but a score without one is not reviewable. */
  rationale: z.string().min(1).optional(),
});
export type EvaluationScore = z.infer<typeof EvaluationScoreSchema>;

/**
 * Whether one limitation held.
 *
 * Boolean, not scored — a limitation is an invariant, and "mostly held" is a breach. Kept
 * out of the sixteen dimensions for exactly that reason: a breach must not be averageable
 * against a good score elsewhere.
 */
export const LimitationVerdictSchema = z.object({
  limitationId: CorpusIdSchema,
  held: z.boolean(),
  /** What breached it. Required in spirit when `held` is false; the reviewer enforces that. */
  evidence: z.string().min(1).optional(),
});
export type LimitationVerdict = z.infer<typeof LimitationVerdictSchema>;

/**
 * A complete scored assessment of one conversation.
 *
 * `scores` must cover every scored dimension exactly once. Completeness is enforced rather
 * than encouraged because the point of an evaluation is comparison — one corpus release
 * against another — and a partial evaluation makes a dimension's absence
 * indistinguishable from a dimension that got worse. The scale exists to make this
 * possible: `0` means `not_observed`, so there is always an honest value to record.
 */
export const EvaluationSchema = z
  .object({
    osReleaseId: OsReleaseIdSchema,
    conversationId: z.string().min(1),
    flowId: CorpusIdSchema,
    evidenceSource: EvidenceSourceSchema,
    scores: z.array(EvaluationScoreSchema),
    limitationVerdicts: z.array(LimitationVerdictSchema).default([]),
    evaluatedAt: z.date(),
  })
  .superRefine((evaluation, ctx) => {
    const seen = new Set(evaluation.scores.map((s) => s.dimension));
    if (seen.size !== evaluation.scores.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scores"],
        message: "each dimension may be scored only once",
      });
    }
    const missing = SCORED_DIMENSIONS.filter((dimension) => !seen.has(dimension));
    if (missing.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scores"],
        message: `evaluation is missing ${missing.length} dimension(s): ${missing.join(", ")}`,
      });
    }
  });
export type Evaluation = z.infer<typeof EvaluationSchema>;

/**
 * The evidence-capture seam.
 *
 * Two methods, because two things happen at different times and are written by different
 * producers: a conversation emits observations while it runs, and an evaluator scores it
 * afterwards — possibly more than once, possibly against a candidate corpus. Folding
 * scoring into the observation write would force every producer to know its own score.
 *
 * Observations are written in batches. A conversation produces many, and batching is what
 * lets an adapter make the write atomic instead of leaving half a conversation's evidence
 * behind after a failure.
 *
 * Interface contract (the invariants an adapter must honour, not just the signature):
 *
 * 1. Inputs are already validated — parse with {@link ObservationSchema} and
 *    {@link EvaluationSchema} at the boundary; adapters trust them
 *    (docs/conventions.md § Errors).
 * 2. `recordObservations` is atomic: every observation in the call is stored, or none is.
 * 3. It returns one id per observation, in the order they were supplied.
 * 4. An empty batch is a no-op returning `[]` — not an error.
 * 5. Adapters store the `osReleaseId` they are given. An adapter must never substitute a
 *    "current" release, which would silently reattribute evidence to a corpus that did not
 *    produce it.
 * 6. Writes are append-only. Evidence is never mutated or deleted through this port; a
 *    re-scored conversation is a new {@link Evaluation}, so disagreement stays visible.
 * 7. `recordEvaluation` stores all sixteen scores and every limitation verdict, or none.
 * 8. Errors are thrown as `ResonanceError` subclasses. A failed write must never be
 *    reported as a successful one — silently dropped evidence is indistinguishable from
 *    evidence that was never produced.
 */
export interface ObservationPort {
  recordObservations(observations: readonly Observation[]): Promise<readonly string[]>;
  recordEvaluation(evaluation: Evaluation): Promise<string>;
}
