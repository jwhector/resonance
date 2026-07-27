import { and, eq, inArray } from "drizzle-orm";
import { ResonanceError, type FollowState } from "@resonance/core";
import { follows } from "../schema/community";
import type { Db } from "../types";

/**
 * The follow graph's write and read surface: two mutations and one state read.
 *
 * Follow *mutation* deliberately does not sit on `DiscoveryPort` — it is not ranking, and putting
 * it there would force every alternative ranker to reimplement it. It lives here, next to the
 * table it owns, and the web layer calls it directly from its Server Actions.
 */

/** A directed follow edge, in Better Auth user ids. */
export type FollowEdge = {
  /** The signed-in member doing the following. */
  followerId: string;
  /** The user being followed — the creator's `user_id`, not their profile uuid. */
  followingId: string;
};

function assertNotSelf({ followerId, followingId }: FollowEdge): void {
  if (followerId === followingId) {
    throw new ResonanceError("follow_self", "A user cannot follow themselves.");
  }
}

/**
 * Follow a creator. **Idempotent**: following twice leaves exactly one edge and does not error,
 * because a double-submitted Follow button is a UI accident, not a conflict worth surfacing.
 *
 * Self-follows throw {@link ResonanceError} `follow_self` rather than silently no-op'ing — the
 * caller has a bug (or the UI rendered a Follow control on the viewer's own row) and should hear
 * about it.
 */
export async function followCreator(db: Db, edge: FollowEdge): Promise<void> {
  assertNotSelf(edge);
  await db
    .insert(follows)
    .values({ followerId: edge.followerId, followingId: edge.followingId })
    .onConflictDoNothing();
}

/** Unfollow. Idempotent in the other direction: unfollowing a creator you don't follow is a no-op. */
export async function unfollowCreator(db: Db, edge: FollowEdge): Promise<void> {
  assertNotSelf(edge);
  await db
    .delete(follows)
    .where(and(eq(follows.followerId, edge.followerId), eq(follows.followingId, edge.followingId)));
}

/**
 * Resolve follow state for a set of users in **one** query — the batch shape exists so a page of
 * result rows never turns into N round trips.
 *
 * `viewerId === null` (signed out) returns `"unknown"` for every id without touching the database:
 * there is no identity whose state could be looked up, and reporting `"not_following"` would be a
 * lie the UI cannot distinguish from a signed-in non-follower. With a viewer present, every id
 * resolves to `"following"` or `"not_following"` — never `"unknown"`.
 */
export async function getFollowStates(
  db: Db,
  viewerId: string | null,
  followingIds: readonly string[],
): Promise<Map<string, FollowState>> {
  const states = new Map<string, FollowState>();
  if (followingIds.length === 0) return states;
  if (viewerId === null) {
    for (const id of followingIds) states.set(id, "unknown");
    return states;
  }
  for (const id of followingIds) states.set(id, "not_following");
  const rows = await db
    .select({ followingId: follows.followingId })
    .from(follows)
    .where(and(eq(follows.followerId, viewerId), inArray(follows.followingId, [...followingIds])));
  for (const row of rows) states.set(row.followingId, "following");
  return states;
}
