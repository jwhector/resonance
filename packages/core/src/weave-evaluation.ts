import { z } from "zod";

/**
 * The evaluation dimensions — what a Weave conversation is scored on.
 *
 * ## Two lists that compose
 *
 * The corpus describes evaluation twice, and the two descriptions are easy to mistake for
 * one. The evolution engine names ten evaluation dimensions. The principles file names
 * seven principles. They are not the same list and neither replaces the other: **one of
 * the ten — `principle_alignment` — is a composite that decomposes into one sub-score per
 * principle. The other nine are process and outcome measures.** So a scored evaluation
 * carries 7 + 9 = 16 numbers, not 10 and not 17.
 *
 * That composition is expressed in the types rather than described in prose:
 * {@link ProcessDimension} is `Exclude`d from {@link EvaluationDimension}, so the nine
 * cannot drift from the ten, and {@link ScoredDimension} is the union that
 * `EvaluationSchema` requires complete coverage of.
 *
 * ## Why a principle is scored per-principle
 *
 * Each principle authors its own `prioritize` and `avoid` lists, which are directly
 * checkable against a transcript. Collapsing them into one "principle alignment" number
 * would discard the rubric the author already wrote and make a regression in one principle
 * invisible behind an improvement in another.
 *
 * ## What is not here
 *
 * There is no roll-up from the seven sub-scores to a single `principle_alignment` value.
 * Whether that is a mean, a minimum, or a weighted blend is a judgement the source
 * documents do not settle, and inventing one here would bake it into every consumer.
 *
 * Limitations are also not dimensions. They are boolean invariants recorded as verdicts
 * (see `weave-observation.ts`), because a limitation that is "mostly held" is breached.
 *
 * @see ./weave-os.ts
 */

// ---------------------------------------------------------------------------
// The score scale
// ---------------------------------------------------------------------------

/**
 * The 0–3 scale the corpus defines, with its authored labels.
 *
 * `0` is `not_observed` rather than "bad", which is what makes complete coverage of all
 * dimensions possible in every evaluation: an evaluator always has something to say.
 */
export const SCORE_LABELS = Object.freeze({
  0: "not_observed",
  1: "weak",
  2: "moderate",
  3: "strong",
} as const);
export type ScoreLabel = (typeof SCORE_LABELS)[keyof typeof SCORE_LABELS];

export const ScoreSchema = z.number().int().min(0).max(3);
export type Score = z.infer<typeof ScoreSchema>;

// ---------------------------------------------------------------------------
// The ten engine dimensions, and the nine leaves
// ---------------------------------------------------------------------------

/** The ten dimensions the evolution engine names. One of them is composite. */
export const EVALUATION_DIMENSIONS = [
  "principle_alignment",
  "creator_support",
  "creator_agency",
  "clarity",
  "pacing",
  "friction",
  "flow_completion",
  "output_quality",
  "adaptation_quality",
  "safety",
] as const;
export const EvaluationDimensionSchema = z.enum(EVALUATION_DIMENSIONS);
export type EvaluationDimension = z.infer<typeof EvaluationDimensionSchema>;

/** The one dimension that is not scored directly, because it decomposes. */
export const COMPOSITE_DIMENSION = "principle_alignment";

/** The nine dimensions measured directly — the ten minus the composite, by construction. */
export type ProcessDimension = Exclude<EvaluationDimension, typeof COMPOSITE_DIMENSION>;
export const PROCESS_DIMENSIONS = [
  "creator_support",
  "creator_agency",
  "clarity",
  "pacing",
  "friction",
  "flow_completion",
  "output_quality",
  "adaptation_quality",
  "safety",
] as const satisfies readonly ProcessDimension[];
export const ProcessDimensionSchema = z.enum(PROCESS_DIMENSIONS);

// ---------------------------------------------------------------------------
// The seven principle sub-scores
// ---------------------------------------------------------------------------

/**
 * The sub-scores `principle_alignment` decomposes into: one per interaction principle.
 *
 * These are principle record ids, so the list tracks the corpus rather than leading it.
 * Promotion may add a principle, at which point this list and the corpus move together —
 * `@resonance/weave-os`'s cross-file validator is what holds the two in agreement, the
 * same check that resolves a flow's `appliedPrinciples`.
 */
export const PRINCIPLE_DIMENSIONS = [
  "support_heart",
  "support_becoming",
  "support_discovery",
  "support_safety",
  "support_clarity",
  "support_experiment",
  "support_intuition",
] as const;
export const PrincipleDimensionSchema = z.enum(PRINCIPLE_DIMENSIONS);
export type PrincipleDimension = z.infer<typeof PrincipleDimensionSchema>;

// ---------------------------------------------------------------------------
// The sixteen
// ---------------------------------------------------------------------------

/** Everything an evaluation scores: the seven principle sub-scores plus the nine leaves. */
export const SCORED_DIMENSIONS = [...PRINCIPLE_DIMENSIONS, ...PROCESS_DIMENSIONS] as const;
export const ScoredDimensionSchema = z.enum(SCORED_DIMENSIONS);
export type ScoredDimension = PrincipleDimension | ProcessDimension;

/** Sixteen. Exported so a consumer can assert coverage without re-deriving the arithmetic. */
export const SCORED_DIMENSION_COUNT = SCORED_DIMENSIONS.length;
