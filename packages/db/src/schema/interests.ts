import { index, integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * The member-side counterpart to the creator profile: what a member says they care about.
 *
 * A creator describes what they offer and that becomes a profile embedding; a member picks
 * topics and that becomes an *interest* embedding in the same vector space. Storing the two
 * comparably is what lets `/discover` rank creators for a member who has typed nothing
 * (`DiscoveryPort` invariant 8 in `@resonance/core`).
 */

/**
 * The curated topic taxonomy the interest picker renders (Figma `1554:79520`).
 *
 * **A table rather than a constant** so the list can be corrected, extended or reordered as a
 * data edit instead of a migration + redeploy. The 13 topics the design draws are seeded by
 * migration `0006_seed_topics`, which is the initial content — not a fixed definition.
 *
 * **The slug is the primary key**, matching `TopicSlugSchema` in `@resonance/core`: a topic is
 * identified by slug everywhere it crosses a boundary (the chip in `ui`, the submitted form in
 * `web`, the row here), so giving it a second, surrogate identity would mean every one of those
 * boundaries had to resolve one to the other. It also makes `member_interests` a pure edge table
 * with no lookup needed to write it, and makes reseeding idempotent rather than a data migration.
 *
 * `sortOrder` exists because the picker's chip order is a design decision, not an alphabetical
 * accident — without it, "the order the frame draws" would have nowhere to live and every read
 * would need its own `ORDER BY` guess.
 */
export const topics = pgTable("topics", {
  slug: text("slug").primaryKey(),
  /** The chip text as designed ("Tea Culture"). This — not the slug — is what gets embedded. */
  label: text("label").notNull(),
  sortOrder: integer("sort_order").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Which topics a member picked. One row per (member, topic).
 *
 * Shaped after `follows` for the same reasons. The composite PK `(member_id, topic_slug)` is the
 * whole identity of the row: it makes re-submitting a selection idempotent via
 * `onConflictDoNothing` and indexes the "what does this member care about" direction for free.
 * The edge points at the **user** (`text` id, Better Auth) rather than at anything derived, so it
 * survives every projection of that user being regenerated.
 *
 * `member_interests_topic_idx` serves the direction the PK's leading column cannot — "who is
 * interested in this topic" — and, more immediately, keeps the `topic_slug` foreign key's
 * referential check off a sequential scan. Postgres does not index a referencing column
 * automatically, and the taxonomy above is explicitly meant to be editable.
 *
 * Both foreign keys cascade on delete: a deleted member takes their selection with them, and a
 * retired topic disappears from every member who picked it rather than blocking its own removal.
 */
export const memberInterests = pgTable(
  "member_interests",
  {
    memberId: text("member_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    topicSlug: text("topic_slug")
      .notNull()
      .references(() => topics.slug, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ name: "member_interests_pk", columns: [t.memberId, t.topicSlug] }),
    index("member_interests_topic_idx").on(t.topicSlug),
  ],
);
