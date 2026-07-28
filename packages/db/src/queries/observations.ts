import { sql } from "drizzle-orm";
import { ResonanceError, type Evaluation, type Observation } from "@resonance/core";
import {
  weaveEvaluations,
  weaveEvaluationScores,
  weaveLimitationVerdicts,
  weaveObservations,
} from "../schema/weave-observation";
import type { Db } from "../types";

/**
 * The deep implementation behind the evidence-capture seam: evidence in, ids out, atomically.
 *
 * Two writes with one shared problem. A conversation's observations must land together or not
 * at all, and an evaluation must land with all sixteen of its scores and every limitation
 * verdict or not at all — because half-written evidence is worse than none. It reads as a real
 * measurement while silently under-counting, and nothing downstream can tell the difference.
 *
 * ## Why atomicity is a single statement here, not a transaction
 *
 * The production driver is Neon's HTTP driver, which has no interactive transactions
 * (ADR-0004) — `db.transaction()` throws there, and the PGlite harness used in tests has no
 * `db.batch()`. The one mechanism both share is Postgres itself: **every single statement runs
 * in its own implicit transaction.** So each write below compiles to exactly one statement.
 * Observations are a single multi-row `INSERT`. An evaluation spans three tables, so its
 * children ride along in data-modifying `WITH` clauses — Postgres runs those exactly once and
 * to completion as part of the same statement, and rolls all of it back together on failure.
 *
 * Row ids are generated here rather than read back from `RETURNING`, which is what makes
 * "one id per observation, in the order supplied" true by construction instead of dependent on
 * the order the server happens to return rows in. It is also what lets an evaluation's child
 * rows reference their parent inside one statement, with no round trip in between.
 */

/**
 * Refuse to write evidence that cannot say which corpus release produced it.
 *
 * The port's own contract forbids an adapter from substituting a "current" release, and this
 * is the last place that can still be enforced. A blank release id passes a `NOT NULL` column
 * happily and then sits in the table looking like a real attribution forever, so it is
 * rejected at the write instead.
 */
function assertAttributable(osReleaseId: string, what: string): void {
  if (osReleaseId.trim() === "") {
    throw new ResonanceError(
      "observation_release_missing",
      `${what} must carry the OS release id that produced it; evidence with no release is not attributable.`,
    );
  }
}

/**
 * Insert a conversation's observations in one statement and return their ids in order.
 *
 * An empty batch writes nothing and returns `[]` — a conversation that produced no signals is
 * a real outcome, not a failure.
 */
export async function insertObservations(
  db: Db,
  observations: readonly Observation[],
): Promise<string[]> {
  if (observations.length === 0) return [];

  const rows = observations.map((observation) => {
    assertAttributable(observation.osReleaseId, "An observation");
    return {
      id: crypto.randomUUID(),
      osReleaseId: observation.osReleaseId,
      conversationId: observation.conversationId,
      flowId: observation.flowId,
      stageId: observation.stageId,
      category: observation.category,
      signal: observation.signal,
      detail: observation.detail ?? null,
      evidenceSource: observation.evidenceSource,
      observedAt: observation.observedAt,
    };
  });

  // One multi-row INSERT: Postgres commits or rolls back the whole statement, so a constraint
  // violation on the last observation leaves none of the earlier ones behind.
  await db.insert(weaveObservations).values(rows);

  return rows.map((row) => row.id);
}

/**
 * Insert an evaluation together with its scores and limitation verdicts, in one statement.
 *
 * The scores are the main insert and the other two tables are `WITH` clauses purely because an
 * evaluation always has sixteen scores and may have no verdicts at all — a clause that inserts
 * nothing cannot be written, but the main statement always has rows.
 */
export async function insertEvaluation(db: Db, evaluation: Evaluation): Promise<string> {
  assertAttributable(evaluation.osReleaseId, "An evaluation");

  const evaluationId = crypto.randomUUID();

  const evaluationInsert = db.insert(weaveEvaluations).values({
    id: evaluationId,
    osReleaseId: evaluation.osReleaseId,
    conversationId: evaluation.conversationId,
    flowId: evaluation.flowId,
    evidenceSource: evaluation.evidenceSource,
    evaluatedAt: evaluation.evaluatedAt,
  });

  const scoresInsert = db.insert(weaveEvaluationScores).values(
    evaluation.scores.map((score) => ({
      evaluationId,
      dimension: score.dimension,
      score: score.score,
      rationale: score.rationale ?? null,
    })),
  );

  const clauses = [sql`weave_evaluation as (${evaluationInsert.getSQL()})`];
  if (evaluation.limitationVerdicts.length > 0) {
    const verdictsInsert = db.insert(weaveLimitationVerdicts).values(
      evaluation.limitationVerdicts.map((verdict) => ({
        evaluationId,
        limitationId: verdict.limitationId,
        held: verdict.held,
        evidence: verdict.evidence ?? null,
      })),
    );
    clauses.push(sql`weave_verdicts as (${verdictsInsert.getSQL()})`);
  }

  // The foreign keys from the child rows to the evaluation are satisfied because Postgres
  // checks them after the statement finishes, by which point the WITH clause has inserted the
  // parent row.
  await db.execute(sql`with ${sql.join(clauses, sql`, `)} ${scoresInsert.getSQL()}`);

  return evaluationId;
}
