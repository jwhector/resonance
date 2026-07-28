import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { CorpusConfidenceSchema, type CorpusConfidence } from "@resonance/core";
import { z } from "zod";
import { weaveObservations } from "./weave-observation";

/**
 * The **records** half of the Weave Pattern Registry (ADR-0020 §4).
 *
 * The registry splits along a lifecycle boundary. Its **rulebook** — where a pattern may be
 * promoted to, what the thresholds are, what each metric means — is stable configuration and
 * lives as corpus YAML in `@resonance/weave-os`, governed by review like the rest of the
 * corpus. What lives here is everything that **accumulates**: the pattern rows themselves and
 * the evidence that piles up behind them, foreign-keyed to the observations that produced it.
 *
 * Nothing in these tables is ever inherited into a runtime prompt. That is the registry's own
 * declared constraint — patterns are addressable and promotable, but they do not change what
 * Weave says until a human promotes one, and promotion is a pull request against the corpus.
 *
 * Source of the record shape: `docs/Weave Pattern Registry.md` (read-only source material).
 */

// ---------------------------------------------------------------------------
// Vocabulary the registry defines
// ---------------------------------------------------------------------------

/**
 * How far a pattern has travelled from "somebody noticed this" to "this is now part of Weave".
 *
 * Enumerated because the registry names all seven states outright. The fields that the
 * registry leaves open-ended — readiness, decision, scope hypothesis, what a pattern was
 * discovered during — are stored as plain text instead, so this package carries the author's
 * value rather than inventing the set it must belong to.
 */
export const PATTERN_LIFECYCLE_STATUSES = [
  "discovered",
  "collecting_evidence",
  "validated",
  "candidate_for_promotion",
  "promoted",
  "retained_in_registry",
  "rejected",
] as const;
export const PatternLifecycleStatusSchema = z.enum(PATTERN_LIFECYCLE_STATUSES);
export type PatternLifecycleStatus = z.infer<typeof PatternLifecycleStatusSchema>;

/**
 * Where a promoted pattern ends up: a foundational commitment, an observable behaviour, a
 * contextual interpretation, or something that stays inside one interview.
 *
 * Which of these a pattern qualifies for is the rulebook's judgement, made from the
 * classification scores below. This is only the vocabulary the answer is written in.
 */
export const PATTERN_PROMOTION_TARGETS = [
  "interaction_principle",
  "behavior_rule",
  "conversation_heuristic",
  "interview_pattern",
] as const;
export const PatternPromotionTargetSchema = z.enum(PATTERN_PROMOTION_TARGETS);
export type PatternPromotionTarget = z.infer<typeof PatternPromotionTargetSchema>;

/** How a piece of evidence relates to the pattern it is attached to. */
export const PATTERN_EVIDENCE_STANCES = ["supporting", "contradicting"] as const;
export const PatternEvidenceStanceSchema = z.enum(PATTERN_EVIDENCE_STANCES);
export type PatternEvidenceStance = z.infer<typeof PatternEvidenceStanceSchema>;

/** The ten counts the registry accumulates as evidence arrives. */
export const PATTERN_EVIDENCE_METRICS = [
  "supporting_case_count",
  "contradicting_case_count",
  "test_count",
  "creator_count",
  "flow_count",
  "stage_count",
  "response_application_count",
  "positive_outcome_count",
  "negative_outcome_count",
  "unresolved_outcome_count",
] as const;
export const PatternEvidenceMetricsSchema = z.object(
  Object.fromEntries(
    PATTERN_EVIDENCE_METRICS.map((m) => [m, z.number().int().nonnegative().default(0)]),
  ) as Record<(typeof PATTERN_EVIDENCE_METRICS)[number], z.ZodDefault<z.ZodNumber>>,
);
export type PatternEvidenceMetrics = z.infer<typeof PatternEvidenceMetricsSchema>;

/** The nine 0–3 assessments that decide which promotion target a pattern fits. */
export const PATTERN_CLASSIFICATION_METRICS = [
  "behavior_directness",
  "interpretation_uncertainty",
  "cross_flow_consistency",
  "contextual_dependency",
  "violation_impact",
  "outcome_consistency",
  "domain_specificity",
  "relationship_significance",
  "stability_over_time",
] as const;
export const PatternClassificationScoresSchema = z.object(
  Object.fromEntries(
    PATTERN_CLASSIFICATION_METRICS.map((m) => [m, z.number().int().min(0).max(3).default(0)]),
  ) as Record<(typeof PATTERN_CLASSIFICATION_METRICS)[number], z.ZodDefault<z.ZodNumber>>,
);
export type PatternClassificationScores = z.infer<typeof PatternClassificationScoresSchema>;

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

/**
 * One pattern record: an observation held open while evidence is collected.
 *
 * `pattern_id` is the corpus id an author writes (`creator_uncertain`), unique so a record can
 * be looked up and updated by the name the registry uses. The surrogate uuid primary key is
 * what child rows point at, matching how `creator_profiles` separates its own natural key from
 * its identity.
 *
 * The two metric maps are stored as `jsonb` rather than nineteen integer columns. The metric
 * names are the rulebook's to define, and the rulebook lives in `@resonance/weave-os`; giving
 * each one a column would make this schema a second, silently divergent copy of that list, and
 * adding a metric would cost a migration instead of a corpus edit. The Zod schemas above type
 * them at the boundary. The registry holds tens of rows, so the scans these maps imply cost
 * nothing worth a column for.
 *
 * Fields the registry attributes to the Evolution Engine's Architect and Validator — proposed
 * destination, validation results, regression findings, risk assessment — are deliberately
 * absent. Those entities are out of scope for this slice (ADR-0020), and columns nothing
 * writes are a guess about a design that does not exist yet.
 */
export const weavePatterns = pgTable(
  "weave_patterns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patternId: text("pattern_id").notNull(),

    // Lifecycle
    lifecycleStatus: text("lifecycle_status").$type<PatternLifecycleStatus>().notNull(),
    /** What the pattern surfaced during, e.g. `flow_design`. Open-ended in the registry. */
    discoveredDuring: text("discovered_during"),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),

    // Scope
    discoveredInFlows: jsonb("discovered_in_flows")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    discoveredInStages: jsonb("discovered_in_stages")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** How widely the pattern is believed to apply, e.g. `cross_flow`. Open-ended. */
    currentScopeHypothesis: text("current_scope_hypothesis"),

    // The observation itself
    observation: text("observation").notNull(),
    possibleSignals: jsonb("possible_signals")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    candidateResponses: jsonb("candidate_responses")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),

    // Evidence. The supporting and contradicting cases are rows in weave_pattern_evidence.
    evidenceConfidence: text("evidence_confidence").$type<CorpusConfidence>().notNull(),
    evidenceMetrics: jsonb("evidence_metrics").$type<PatternEvidenceMetrics>().notNull(),
    observedOutcomes: jsonb("observed_outcomes")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    /** Where the pattern is known not to hold. Not the same as Weave's own limitations. */
    evidenceLimitations: jsonb("evidence_limitations")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    evidenceNotes: text("evidence_notes").notNull().default(""),

    // Classification
    candidatePromotions: jsonb("candidate_promotions")
      .$type<PatternPromotionTarget[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    classificationScores: jsonb("classification_scores")
      .$type<PatternClassificationScores>()
      .notNull(),
    classificationRationale: text("classification_rationale").notNull().default(""),

    // Promotion. `readiness` and `decision` are open-ended in the registry (`not_ready`,
    // `pending` are the attested values), so they are carried as written.
    promotionReadiness: text("promotion_readiness").notNull().default("not_ready"),
    recommendedTarget: text("recommended_target").$type<PatternPromotionTarget>(),
    promotionDecision: text("promotion_decision").notNull().default("pending"),
    /** The corpus record this pattern became, once promoted. */
    promotedId: text("promoted_id"),
    promotedVersion: text("promoted_version"),
    decisionRationale: text("decision_rationale").notNull().default(""),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    // One record per corpus pattern id, so a re-import updates in place instead of forking it.
    uniqueIndex("weave_patterns_pattern_id_uq").on(t.patternId),
    // "What is collecting evidence / awaiting review" is how the registry is worked through.
    index("weave_patterns_lifecycle_idx").on(t.lifecycleStatus),
    index("weave_patterns_decision_idx").on(t.promotionDecision),
    index("weave_patterns_confidence_idx").on(t.evidenceConfidence),
  ],
);
export type WeavePatternRow = typeof weavePatterns.$inferSelect;

/**
 * One observation cited for or against a pattern — the foreign key that makes a pattern's
 * confidence auditable.
 *
 * Without this table a pattern's counts would be numbers nobody could check. With it, every
 * increment points at the moment in a conversation that justified it, and that moment carries
 * the corpus release it happened under, so evidence gathered before a behaviour changed stays
 * distinguishable from evidence gathered after.
 *
 * Unique on `(pattern_id, observation_id)`: one observation is cited once per pattern, which
 * makes attaching evidence idempotent and stops a replayed import inflating a count.
 */
export const weavePatternEvidence = pgTable(
  "weave_pattern_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patternId: uuid("pattern_id")
      .notNull()
      .references(() => weavePatterns.id, { onDelete: "cascade" }),
    observationId: uuid("observation_id")
      .notNull()
      .references(() => weaveObservations.id, { onDelete: "cascade" }),
    stance: text("stance").$type<PatternEvidenceStance>().notNull(),
    /** Why this observation counts, when the observation alone does not make it obvious. */
    note: text("note"),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("weave_pattern_evidence_uq").on(t.patternId, t.observationId),
    // Counting supporting versus contradicting cases for one pattern.
    index("weave_pattern_evidence_stance_idx").on(t.patternId, t.stance),
    // The reverse read: which patterns already cite this observation.
    index("weave_pattern_evidence_observation_idx").on(t.observationId),
  ],
);
export type WeavePatternEvidenceRow = typeof weavePatternEvidence.$inferSelect;

// ---------------------------------------------------------------------------
// Boundary validation
// ---------------------------------------------------------------------------

/** The insert shape for a pattern record, validated before it reaches the table. */
export const PatternRecordInputSchema = z.object({
  patternId: z.string().min(1),
  lifecycleStatus: PatternLifecycleStatusSchema,
  discoveredDuring: z.string().min(1).nullable().default(null),
  lastReviewedAt: z.date().nullable().default(null),
  discoveredInFlows: z.array(z.string().min(1)).default([]),
  discoveredInStages: z.array(z.string().min(1)).default([]),
  currentScopeHypothesis: z.string().min(1).nullable().default(null),
  observation: z.string().min(1),
  possibleSignals: z.array(z.string().min(1)).default([]),
  candidateResponses: z.array(z.string().min(1)).default([]),
  evidenceConfidence: CorpusConfidenceSchema,
  evidenceMetrics: PatternEvidenceMetricsSchema,
  observedOutcomes: z.array(z.string().min(1)).default([]),
  evidenceLimitations: z.array(z.string().min(1)).default([]),
  evidenceNotes: z.string().default(""),
  candidatePromotions: z.array(PatternPromotionTargetSchema).default([]),
  classificationScores: PatternClassificationScoresSchema,
  classificationRationale: z.string().default(""),
  promotionReadiness: z.string().min(1).default("not_ready"),
  recommendedTarget: PatternPromotionTargetSchema.nullable().default(null),
  promotionDecision: z.string().min(1).default("pending"),
  promotedId: z.string().min(1).nullable().default(null),
  promotedVersion: z.string().min(1).nullable().default(null),
  decisionRationale: z.string().default(""),
});
export type PatternRecordInput = z.infer<typeof PatternRecordInputSchema>;

/** The insert shape for one cited observation. */
export const PatternEvidenceInputSchema = z.object({
  patternId: z.string().uuid(),
  observationId: z.string().uuid(),
  stance: PatternEvidenceStanceSchema,
  note: z.string().min(1).nullable().default(null),
});
export type PatternEvidenceInput = z.infer<typeof PatternEvidenceInputSchema>;
