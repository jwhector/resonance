import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * One creator's staged onboarding interview, in whichever of its two shapes it is in.
 *
 * The row is an envelope around `@resonance/core`'s `CreatorOnboardingSession`, not a
 * decomposition of it. `state` holds the session JSON exactly as the schema defines it, and
 * every read parses it back through `CreatorOnboardingSessionSchema`. Splitting stages or slots
 * into columns would give this package its own copy of a vocabulary that belongs to the
 * behaviour provider, and a second provider would then need a migration just to ask a different
 * question (ADR-0022).
 *
 * Only what the store itself must reason about in SQL lives outside `state`:
 *
 * - **`user_id` is the primary key.** One session per creator is the whole ownership model:
 *   every read and write is keyed by the authenticated user, so there is no session id a
 *   caller could substitute to reach someone else's row.
 * - **`revision`** is the optimistic-concurrency token, kept as a column so a save can compare
 *   and bump it in the `WHERE` of a single statement.
 * - **`session_id`** pins a commit to the interview it was made in, so a commit from a session
 *   that has since been replaced cannot complete its successor.
 *
 *   Both are stripped from `state` on write and folded back in on read, so a column and the
 *   JSON can never disagree about them.
 * - **`completion_key`** is the idempotency key of the commit that completed the session. It is
 *   how a replayed commit is told apart from the original after the fact, without having to
 *   read a result set back from a data-modifying statement.
 *
 * `state` carries no transcript and, once completed, no private answers — both are properties
 * of the session schema rather than of this table, which is why cleanup needs no code here.
 * The row cascades with its user.
 */
export const creatorOnboardingSessions = pgTable("creator_onboarding_sessions", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  sessionId: text("session_id").notNull(),
  revision: integer("revision").notNull(),
  state: jsonb("state").$type<Record<string, unknown>>().notNull(),
  completionKey: text("completion_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
