import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { EvidenceSource, ObservationCategory, ScoredDimension } from "@resonance/core";

/**
 * Storage for the evidence-capture seam: what a Weave conversation did, and how it scored.
 *
 * The shapes come from `@resonance/core`'s `weave-observation.ts` — this file is where they
 * land, not where they are defined. Four tables, because the source data has four different
 * lifetimes: an observation is a moment, an evaluation is an assessment of a whole
 * conversation, a score is one of sixteen numbers in that assessment, and a limitation
 * verdict is a yes/no that must never be averaged with the numbers.
 *
 * Everything here is **append-only**. Evidence is never updated or deleted; a conversation
 * scored a second time produces a second evaluation, so disagreement between two scorings
 * stays visible instead of being overwritten.
 */

/**
 * One recorded moment of evidence from a conversation.
 *
 * `os_release_id` has **no default** on purpose. Evidence is only meaningful against the
 * corpus release that produced it, so a row that cannot say which release it came from is
 * worthless — and a row that quietly claims the wrong one is worse. The column being
 * `NOT NULL` with nothing to fall back on means no write path can invent an attribution.
 *
 * `observed_at` is when the moment happened, supplied by whatever produced it; `recorded_at`
 * is when the row landed. They differ whenever evidence is written after the fact, which a
 * simulated run does by design.
 *
 * `stage_id` is nullable because a conversation genuinely produces evidence outside any
 * stage. `signal` is free text: the vocabulary is authored per flow, and `@resonance/weave-os`
 * checks a signal against its flow — closing the set here would stop a flow declaring one.
 */
export const weaveObservations = pgTable(
  "weave_observations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    osReleaseId: text("os_release_id").notNull(),
    conversationId: text("conversation_id").notNull(),
    flowId: text("flow_id").notNull(),
    stageId: text("stage_id"),
    category: text("category").$type<ObservationCategory>().notNull(),
    signal: text("signal").notNull(),
    detail: text("detail"),
    evidenceSource: text("evidence_source").$type<EvidenceSource>().notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    // "Everything produced by release X" is the comparison the evolution engine exists to make.
    index("weave_observations_release_idx").on(t.osReleaseId),
    // Replaying one conversation's evidence in order.
    index("weave_observations_conversation_idx").on(t.conversationId, t.observedAt),
    // Narrowing to a flow, and to a stage within it — the composite serves both.
    index("weave_observations_flow_stage_idx").on(t.flowId, t.stageId),
    // Counting a signal, optionally within its category. Category leads because a signal name
    // is only meaningful alongside what it describes.
    index("weave_observations_category_signal_idx").on(t.category, t.signal),
    // Separating design hypotheses from production evidence when weighing a pattern.
    index("weave_observations_source_idx").on(t.evidenceSource),
  ],
);
export type WeaveObservationRow = typeof weaveObservations.$inferSelect;

/**
 * A complete scored assessment of one conversation.
 *
 * Deliberately **not** unique on `conversation_id`: re-scoring a conversation — against a
 * candidate corpus, or by a second evaluator — inserts another evaluation. Two rows for one
 * conversation is the point, not a bug.
 */
export const weaveEvaluations = pgTable(
  "weave_evaluations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    osReleaseId: text("os_release_id").notNull(),
    conversationId: text("conversation_id").notNull(),
    flowId: text("flow_id").notNull(),
    evidenceSource: text("evidence_source").$type<EvidenceSource>().notNull(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("weave_evaluations_release_idx").on(t.osReleaseId),
    index("weave_evaluations_conversation_idx").on(t.conversationId),
    index("weave_evaluations_flow_idx").on(t.flowId),
    index("weave_evaluations_source_idx").on(t.evidenceSource),
  ],
);
export type WeaveEvaluationRow = typeof weaveEvaluations.$inferSelect;

/**
 * One dimension's score within an evaluation — sixteen rows per evaluation.
 *
 * Rows rather than sixteen columns because the set of dimensions is corpus-derived: promoting
 * a new interaction principle adds a seventeenth, and that should cost evidence, not a
 * migration. The unique index enforces in the database what `EvaluationSchema` enforces in
 * Zod — a dimension is scored once — so no second write path can duplicate one.
 *
 * The 0–3 range is a CHECK because the scale is a domain invariant with authored labels
 * (`0 = not_observed` … `3 = strong`), not a convention a caller may stretch.
 */
export const weaveEvaluationScores = pgTable(
  "weave_evaluation_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => weaveEvaluations.id, { onDelete: "cascade" }),
    dimension: text("dimension").$type<ScoredDimension>().notNull(),
    score: integer("score").notNull(),
    rationale: text("rationale"),
  },
  (t) => [
    uniqueIndex("weave_evaluation_scores_dimension_uq").on(t.evaluationId, t.dimension),
    // Trending one dimension across evaluations, e.g. "did clarity regress in this release".
    index("weave_evaluation_scores_dimension_idx").on(t.dimension),
    check("weave_evaluation_scores_score_range", sql`score between 0 and 3`),
  ],
);
export type WeaveEvaluationScoreRow = typeof weaveEvaluationScores.$inferSelect;

/**
 * Whether one limitation held during an evaluated conversation.
 *
 * A separate table from the scores, with a boolean and no score column, because a limitation
 * is an invariant: "mostly held" is a breach. Storing it as a 0–3 score would let a violation
 * be averaged away against a good number somewhere else, which is exactly the arithmetic the
 * corpus's own design forbids.
 */
export const weaveLimitationVerdicts = pgTable(
  "weave_limitation_verdicts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    evaluationId: uuid("evaluation_id")
      .notNull()
      .references(() => weaveEvaluations.id, { onDelete: "cascade" }),
    limitationId: text("limitation_id").notNull(),
    held: boolean("held").notNull(),
    evidence: text("evidence"),
  },
  (t) => [
    uniqueIndex("weave_limitation_verdicts_limitation_uq").on(t.evaluationId, t.limitationId),
    // "Every conversation where this limitation was breached" is the safety review query.
    index("weave_limitation_verdicts_breach_idx").on(t.limitationId, t.held),
  ],
);
export type WeaveLimitationVerdictRow = typeof weaveLimitationVerdicts.$inferSelect;
