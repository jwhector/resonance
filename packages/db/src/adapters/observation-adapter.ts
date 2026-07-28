import type { Evaluation, Observation, ObservationPort } from "@resonance/core";
import { insertEvaluation, insertObservations } from "../queries/observations";
import type { Db } from "../types";

/**
 * The `@resonance/db` adapter for `core`'s `ObservationPort` — the durable half of the
 * evidence-capture seam (ADR-0017). The in-test fake in `core` is the second adapter, so the
 * seam is real rather than hypothetical.
 *
 * Short by design, exactly like `createDiscoveryAdapter`: the interesting part is the
 * single-statement atomicity in `queries/observations.ts`, and a fat adapter here would mean
 * those invariants had leaked out of the query.
 */

/**
 * Everything the adapter needs, and deliberately nothing else.
 *
 * There is no corpus release in these dependencies, and that absence is load-bearing. The port
 * forbids an adapter from substituting a "current" release for a missing one, and the surest
 * way to honour that is to leave the adapter nothing to substitute: the release id can only
 * come from the evidence itself, stamped by whatever produced it.
 */
export type ObservationAdapterDeps = {
  db: Db;
};

/**
 * Build the live `ObservationPort`.
 *
 * Honours the interface contract documented on `ObservationPort`: batched observation writes
 * are all-or-nothing, ids come back one per observation in the order supplied, an empty batch
 * is a no-op returning `[]`, an evaluation stores all sixteen scores and every limitation
 * verdict or none, the supplied `osReleaseId` is stored verbatim, and writes are append-only.
 * Failures throw `ResonanceError` subclasses — a write that did not happen is never reported
 * as one that did.
 */
export function createObservationAdapter({ db }: ObservationAdapterDeps): ObservationPort {
  return {
    async recordObservations(observations: readonly Observation[]): Promise<readonly string[]> {
      // `observations` arrived through ObservationSchema at the producer's boundary; adapters
      // trust that (conventions.md § Errors). The one thing still checked below the seam is
      // attribution, because a release id the adapter cannot vouch for makes the row useless.
      return insertObservations(db, observations);
    },

    async recordEvaluation(evaluation: Evaluation): Promise<string> {
      return insertEvaluation(db, evaluation);
    },
  };
}
