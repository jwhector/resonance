import { z } from "zod";
import {
  BoundsSchema,
  CorpusFileHeaderSchema,
  CorpusIdSchema,
  GuidanceSchema,
} from "@resonance/core";

/**
 * The Pattern Registry's rulebook: the half of the registry that is stable, governed
 * config rather than accumulating evidence.
 *
 * ## Why this schema is here and not in `@resonance/core`
 *
 * `@resonance/core` names `pattern_registry` as a corpus file type but deliberately gives
 * it no body schema, because the registry splits across two homes (ADR-0020 § 4): the
 * rulebook below is repo YAML governed like the rest of the corpus, while the pattern and
 * evidence *records* are Postgres rows reached through `@resonance/db`. Only this package
 * parses the rulebook, so only this package needs its shape. If a second package ever
 * needs it, it graduates to `core` — that is the rule `core` is held to (2+ consumers).
 *
 * ## What the rulebook is for
 *
 * It answers, for a pattern that has gathered enough evidence: where does it go, what may
 * promoting it do to that file, and what has to be true first. Those answers change by
 * review under CODEOWNERS, which is why they are a governed file rather than a constant.
 */

/** Where a promoted pattern lands, and what promoting it may do to that file. */
export const PromotionDestinationSchema = z.object({
  /** A corpus-relative path. May be a template (`active/{target_flow}.yaml`). */
  file: z.string().min(1),
  optionalFile: z.string().min(1).optional(),
  promotionActions: z.array(z.string().min(1)).min(1),
});
export type PromotionDestination = z.infer<typeof PromotionDestinationSchema>;

/** One state a pattern record occupies, and what being in it means. */
export const LifecycleStateSchema = z.object({ description: z.string().min(1) });
export type LifecycleState = z.infer<typeof LifecycleStateSchema>;

/** When a destination is the likely one for a pattern. */
export const PromotionTargetSchema = z.object({
  description: z.string().min(1),
  useWhen: z.array(z.string().min(1)).min(1),
});
export type PromotionTarget = z.infer<typeof PromotionTargetSchema>;

/** A named measure, defined once so the records that carry it cannot drift from it. */
export const MetricDefinitionSchema = z.object({ description: z.string().min(1) });
export type MetricDefinition = z.infer<typeof MetricDefinitionSchema>;

/**
 * Score thresholds that make a destination likely, keyed by classification metric.
 *
 * Reuses `BoundsSchema` because the registry states thresholds as `minimum` / `maximum`
 * exactly as the flow states its length and count bounds — one bound type, not two.
 */
export const PromotionGuidanceSchema = z.record(CorpusIdSchema, BoundsSchema);
export type PromotionGuidance = z.infer<typeof PromotionGuidanceSchema>;

export const PromotionReadinessSchema = z.object({
  minimumRequirements: z.array(z.string().min(1)).min(1),
  note: z.string().min(1).optional(),
});
export type PromotionReadiness = z.infer<typeof PromotionReadinessSchema>;

/**
 * The rulebook file.
 *
 * There is no `patterns` field, and that is the point of the split: a pattern record is a
 * row, not a list entry. Anything the rulebook declares about records — required fields,
 * the confidence ladder, the metric definitions — is declared here so `@resonance/db`'s
 * table and this file cannot silently disagree.
 */
export const PatternRegistryRulebookSchema = CorpusFileHeaderSchema.extend({
  type: z.literal("pattern_registry"),
  purpose: z.string().min(1),
  promotionDestinations: z.record(CorpusIdSchema, PromotionDestinationSchema),
  lifecycleStates: z.record(CorpusIdSchema, LifecycleStateSchema),
  promotionTargets: z.record(CorpusIdSchema, PromotionTargetSchema),
  /** The 0–3 scale, keyed by the score as a string because YAML keys are strings. */
  scoreScale: z.record(z.string().min(1), z.string().min(1)),
  confidenceLevels: z.record(z.string().min(1), MetricDefinitionSchema),
  evidenceMetrics: z.record(CorpusIdSchema, MetricDefinitionSchema),
  classificationMetrics: z.record(CorpusIdSchema, MetricDefinitionSchema),
  promotionGuidance: z.record(CorpusIdSchema, PromotionGuidanceSchema),
  promotionReadiness: PromotionReadinessSchema,
  patternSchema: z.object({ requiredFields: z.array(CorpusIdSchema).min(1) }),
  guidance: GuidanceSchema.default({}),
});
export type PatternRegistryRulebook = z.infer<typeof PatternRegistryRulebookSchema>;
