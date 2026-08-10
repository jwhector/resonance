import type {
  CreatorDiscoveryQuery,
  CreatorResultPage,
  DiscoveryPort,
  DiscoveryViewer,
} from "@resonance/core";
import { searchCreatorProfiles } from "../queries/discovery";
import { getMemberInterestEmbedding } from "../queries/interests";
import type { Db } from "../types";

/**
 * The `@resonance/db` adapter for `core`'s `DiscoveryPort` — the ANN half of the swappable
 * ranking seam (ADR-0017). The in-test fake in `core` is the second adapter, so the seam is real.
 *
 * All the adapter does is resolve a **query vector** and hand it to `searchCreatorProfiles`.
 * There are two sources for that vector and the choice between them is the whole of the
 * personalization feature: the embedded search text when the member typed something, or the
 * member's stored interest vector when they did not. Both then flow through the identical ranking
 * call, which is what makes invariants 2–7 hold on the personalized branch without restating
 * them. Everything else lives in `searchCreatorProfiles`, which is why this file is short — a fat
 * adapter here would mean the invariants had leaked out of the query.
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
 * `ResonanceError` subclasses; an empty page always means "nothing to show you" — no matches, or
 * (invariant 8) nothing to personalize on — never "something broke".
 */
export function createDiscoveryAdapter({ db, embed }: DiscoveryAdapterDeps): DiscoveryPort {
  /**
   * "Nothing to rank on" — never "here is everything" (invariant 8). A fresh object each call:
   * the page is handed to callers, and a shared literal would let one caller's mutation leak
   * into the next.
   */
  const emptyPage = (): CreatorResultPage => ({ kind: "creators", results: [], nextCursor: null });

  return {
    async searchCreators(
      query: CreatorDiscoveryQuery,
      viewer: DiscoveryViewer,
    ): Promise<CreatorResultPage> {
      // Invariant 8: absent text means "rank for this viewer", not "search for nothing". The
      // ranking signal becomes the viewer's stored interest vector — the same vector space the
      // creator profiles live in, so the comparison is meaningful without any second index.
      //
      // Two ways that can come up empty, and both mean the same thing: a signed-out viewer has no
      // identity to personalize on, and a member who skipped the picker has no selection to
      // personalize from. Neither is an error and neither justifies falling back to "here is
      // everything" — an unranked dump would be a different, dishonest answer to the question
      // asked. Returning here is also what keeps `undefined` from ever reaching the embedder.
      //
      // `query.text` and this branch stay separate rather than collapsing into one nullable
      // vector, because a signed-in member who typed a query gets their query ranked, not their
      // interests — the typed text is the stronger, more current signal.
      let embedding: number[];
      if (query.text === undefined) {
        if (viewer === null) return emptyPage();
        const interest = await getMemberInterestEmbedding(db, viewer.userId);
        if (interest === null) return emptyPage();
        embedding = interest;
      } else {
        // `query` arrived through CreatorDiscoveryQuerySchema at the web boundary; adapters trust
        // it. The one thing not yet checked is the vector, which the
        // embedder produces — searchCreatorProfiles asserts its width before any SQL runs.
        embedding = await embed(query.text);
      }

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
