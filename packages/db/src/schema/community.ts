import { index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Who follows whom. A directed edge between two Better Auth users (both ids are `text`,
 * matching `user.id`).
 *
 * **The edge is between USERS, not between a user and a creator profile.** A creator profile is
 * a projection of a user that can be regenerated (`createCreatorProfile` upserts on `user_id`);
 * hanging follows off the profile uuid would make the graph fragile to that. Following is also
 * a member-to-member capability the moment the community slice grows, so the user-to-user shape
 * needs no migration then.
 *
 * The composite PK `(follower_id, following_id)` is the whole identity of the row: it makes
 * `followCreator` idempotent via `onConflictDoNothing` (double-clicking Follow is a no-op rather
 * than a duplicate edge) and indexes the "does A follow B / what does A follow" direction for
 * free. The extra `following_id` index serves the other direction — follower counts and
 * "who follows this creator" — which the PK's leading column cannot.
 *
 * Self-follows are rejected in `followCreator` rather than by a CHECK constraint: the guard
 * needs to raise a typed `ResonanceError` the web layer can branch on, and a constraint
 * violation would surface as an opaque driver error at that seam.
 */
export const follows = pgTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    followingId: text("following_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ name: "follows_pk", columns: [t.followerId, t.followingId] }),
    index("follows_following_idx").on(t.followingId),
  ],
);
