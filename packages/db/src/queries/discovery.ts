import { and, asc, cosineDistance, desc, eq, sql, type SQL } from "drizzle-orm";
import {
  assertEmbeddingDims,
  DISCOVERY_DEFAULT_LIMIT,
  type CreatorResult,
  type FollowState,
  ResonanceError,
} from "@resonance/core";
import { follows } from "../schema/community";
import { creatorProfiles, embeddings } from "../schema/creator";
import type { Db } from "../types";

/**
 * The deep implementation behind the discovery seam: embed-in, ranked-page-out.
 *
 * `searchCreatorProfiles` is the single ANN read path over creator profiles. Everything that
 * makes discovery correct lives here — the `status = 'ready'` filter, the dimension guard, tag
 * containment, the similarity floor, deterministic ordering, keyset pagination, and per-viewer
 * follow state — so no caller can assemble a subset of them and get a subtly wrong page.
 *
 * `findSimilarProfiles` (in `./profiles`) is a thin wrapper over this function, not a second
 * implementation: one query, one set of invariants, nothing to drift.
 */

/** Arguments to {@link searchCreatorProfiles}. Only `embedding` is required. */
export type CreatorSearchArgs = {
  /** The query vector. Must be `EMBEDDING_DIMS` wide — asserted before any SQL runs. */
  embedding: readonly number[];
  /**
   * Tag filter, **conjunctive**: a profile matches only if its `tags` contain *every* tag
   * listed. Multi-select therefore narrows monotonically, which is what a facet should do, and
   * it compiles to one indexable `@>` containment test rather than an OR chain. Empty = no
   * filter.
   */
  tags?: readonly string[];
  /** Minimum similarity, inclusive. Omitted means no floor. */
  threshold?: number;
  /** Page size. Defaults to `DISCOVERY_DEFAULT_LIMIT`. */
  limit?: number;
  /** The viewer, for follow state. `null`/omitted ⇒ every row is `"unknown"`. */
  viewerId?: string | null;
  /** An opaque cursor from a previous page's `nextCursor`. */
  cursor?: string | null;
};

/** One page of ranked creators. Shape-compatible with `core`'s `CreatorResultPage` minus `kind`. */
export type CreatorSearchPage = {
  results: CreatorResult[];
  /** `null` iff this is the last page. Never `undefined` — "no more results" is always explicit. */
  nextCursor: string | null;
};

/**
 * The keyset position of the last row on a page: `(similarity, profileId)`, matching the
 * `similarity DESC, id ASC` sort. Similarity alone is not a key — ties would skip or repeat rows
 * — so the profile id breaks them and makes the sort a total order.
 */
type Cursor = { similarity: number; profileId: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Cursors are base64url so callers see something plainly not meant to be parsed. That is
 * encapsulation, not security — {@link decodeCursor} therefore validates the decoded payload
 * rather than trusting it, because a cursor arrives from the client on every page-2 request.
 * `btoa`/`atob` (rather than `Buffer`) keep this working on every runtime the package targets.
 */
function encodeCursor(c: Cursor): string {
  return btoa(`${c.similarity}|${c.profileId}`).replace(/\+/g, "-").replace(/\//g, "_");
}

function decodeCursor(raw: string): Cursor {
  const bad = () => new ResonanceError("discovery_invalid_cursor", "Malformed discovery cursor.");
  let decoded: string;
  try {
    decoded = atob(raw.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    throw bad();
  }
  const sep = decoded.indexOf("|");
  if (sep < 0) throw bad();
  const similarity = Number(decoded.slice(0, sep));
  const profileId = decoded.slice(sep + 1);
  // Both halves reach SQL, so both are checked: a non-finite similarity or a non-uuid id would
  // otherwise surface as an opaque driver error instead of a typed one.
  if (!Number.isFinite(similarity) || !UUID_RE.test(profileId)) throw bad();
  return { similarity, profileId };
}

/** Guard against float drift pushing a cosine similarity a hair outside `CreatorResultSchema`'s [-1, 1]. */
function clamp(n: number): number {
  return Math.min(1, Math.max(-1, n));
}

export async function searchCreatorProfiles(
  db: Db,
  args: CreatorSearchArgs,
): Promise<CreatorSearchPage> {
  // Before any SQL: a wrong-width vector does not error inside pgvector, it silently matches
  // nothing — indistinguishable from "no results" (ADR-0010). Fail loudly instead.
  assertEmbeddingDims(args.embedding);

  const limit = args.limit ?? DISCOVERY_DEFAULT_LIMIT;
  const viewerId = args.viewerId ?? null;
  const tags = args.tags ?? [];

  const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, [...args.embedding])})`;

  // A correlated EXISTS rather than a LEFT JOIN: it cannot duplicate result rows, it costs
  // nothing when there is no viewer, and it is served by the follows composite primary key.
  const followState: SQL<FollowState> = viewerId
    ? sql`case when exists (
          select 1 from ${follows}
          where ${follows.followerId} = ${viewerId}
            and ${follows.followingId} = ${creatorProfiles.userId}
        ) then 'following' else 'not_following' end`
    : sql`'unknown'`;

  const where: SQL[] = [
    eq(embeddings.sourceType, "creator_profile"),
    // Drafts are unpublished work and never discoverable.
    eq(creatorProfiles.status, "ready"),
  ];
  if (tags.length > 0) {
    where.push(sql`${creatorProfiles.tags} @> ${JSON.stringify([...tags])}::jsonb`);
  }
  if (args.threshold !== undefined) {
    where.push(sql`${similarity} >= ${args.threshold}`);
  }
  if (args.cursor) {
    const { similarity: s, profileId } = decodeCursor(args.cursor);
    where.push(
      sql`(${similarity} < ${s} or (${similarity} = ${s} and ${creatorProfiles.id} > ${profileId}::uuid))`,
    );
  }

  // limit + 1: the extra row is never returned, it only answers "is there a next page?" exactly,
  // so `nextCursor` is non-null *iff* more rows follow rather than merely "iff the page was full".
  const rows = await db
    .select({
      profileId: creatorProfiles.id,
      userId: creatorProfiles.userId,
      displayName: creatorProfiles.displayName,
      headline: creatorProfiles.headline,
      tags: creatorProfiles.tags,
      similarity,
      followState,
    })
    .from(embeddings)
    // innerJoin intentionally excludes profiles that have no embedding row yet
    .innerJoin(creatorProfiles, eq(creatorProfiles.id, embeddings.sourceId))
    .where(and(...where))
    .orderBy(desc(similarity), asc(creatorProfiles.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  const results: CreatorResult[] = page.map((r) => ({
    profileId: r.profileId,
    userId: r.userId,
    displayName: r.displayName,
    headline: r.headline,
    tags: r.tags,
    similarity: clamp(Number(r.similarity)),
    followState: r.followState,
  }));
  // The cursor carries the RAW similarity, not the clamped one: the next page compares it against
  // the same unclamped SQL expression, and clamping here could skip rows sitting exactly on 1.
  const last = page[page.length - 1];

  return {
    results,
    nextCursor:
      hasMore && last
        ? encodeCursor({ similarity: Number(last.similarity), profileId: last.profileId })
        : null,
  };
}
