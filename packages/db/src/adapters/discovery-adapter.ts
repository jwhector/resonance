import type {
  CreatorDiscoveryQuery,
  CreatorResultPage,
  DiscoveryPort,
  DiscoveryViewer,
} from "@resonance/core";
import { searchCreatorProfiles } from "../queries/discovery";
import type { Db } from "../types";

/**
 * The `@resonance/db` adapter for `core`'s `DiscoveryPort` — the ANN half of the swappable
 * ranking seam (ADR-0017). The in-test fake in `core` is the second adapter, so the seam is real.
 *
 * All the adapter does is join two things `core` cannot join itself: text→vector (owned by
 * `@resonance/ai`) and vector→ranked page (owned by this package). Everything else lives in
 * `searchCreatorProfiles`, which is why this file is short — a fat adapter here would mean the
 * invariants had leaked out of the query.
 */

/**
 * Text → query vector. Injected rather than imported because the dependency runs `ai → db`, not
 * the other way (ADR-0003): `@resonance/db` must not know Voyage exists.
 *
 * Wire it in the app layer with `@resonance/ai`'s embedder — `(text) => resolveEmbedder().embed(text)`
 * — and in tests with the deterministic fake. Exactly the "accept dependencies, don't create them"
 * rule that makes `Db` the first argument everywhere else in this package.
 */
export type QueryEmbedder = (text: string) => Promise<number[]>;

export type DiscoveryAdapterDeps = {
  db: Db;
  embed: QueryEmbedder;
};

/**
 * Build the live `DiscoveryPort`.
 *
 * Honours the interface contract documented on `DiscoveryPort`: results are ordered by descending
 * similarity, respect `threshold` and `limit`, exclude drafts, carry per-viewer follow state
 * (`"unknown"` throughout iff `viewer` is `null`), and return `nextCursor: null` only on the last
 * page. Failures — a misconfigured embedder, a bad cursor, a wrong-width vector — throw
 * `ResonanceError` subclasses; an empty page always means "no matches".
 */
export function createDiscoveryAdapter({ db, embed }: DiscoveryAdapterDeps): DiscoveryPort {
  return {
    async searchCreators(
      query: CreatorDiscoveryQuery,
      viewer: DiscoveryViewer,
    ): Promise<CreatorResultPage> {
      // Invariant 8: absent text means "rank for this viewer", not "search for nothing". The
      // interest vector that will feed this branch is storage this package does not have yet —
      // the topics / member_interests tables and the 'interest' embedding land in resonance-e2d0.
      // Until they do, no member has interests, so the contract's documented fallback for a
      // viewer without interests — an empty page — is also the truthful answer here. Returning
      // early also keeps `undefined` from ever reaching the embedder.
      if (query.text === undefined) {
        return { kind: "creators", results: [], nextCursor: null };
      }

      // `query` arrived through CreatorDiscoveryQuerySchema at the web boundary; adapters trust it
      // (conventions.md § Errors). The one thing not yet checked is the vector, which the embedder
      // produces — searchCreatorProfiles asserts its width before any SQL runs.
      const embedding = await embed(query.text);
      const { results, nextCursor } = await searchCreatorProfiles(db, {
        embedding,
        tags: query.tags,
        threshold: query.threshold,
        limit: query.limit,
        cursor: query.cursor,
        viewerId: viewer?.userId ?? null,
      });
      return { kind: "creators", results, nextCursor };
    },
  };
}
