import { and, asc, eq, inArray, ne, notInArray, sql } from "drizzle-orm";
import { ResonanceError, type Topic } from "@resonance/core";
import { embeddings } from "../schema/creator";
import { memberInterests, topics } from "../schema/interests";
import type { Db } from "../types";

/**
 * The member-interest write and read surface: the curated taxonomy, a member's selection, and the
 * one vector that selection becomes.
 *
 * Interest *mutation* deliberately does not sit on `DiscoveryPort`, for the same reason follow
 * mutation does not: it is not ranking, and putting it there would force every alternative ranker
 * to reimplement it. It lives here, next to the tables it owns, and the web layer calls it
 * directly from its Server Action.
 *
 * What the port *does* consume is the vector — read back by
 * {@link getMemberInterestEmbedding} and handed to `searchCreatorProfiles` exactly as an embedded
 * query string would be. That is the whole of the personalization path: one more source for the
 * query vector, behind the seam that already existed.
 */

/**
 * The slice of an embedder this package needs: a model id to key the stored row by, and
 * text→vector.
 *
 * **Injected, never imported** — the dependency runs `ai → db` (ADR-0003), so this package must
 * not know Voyage exists. `@resonance/ai`'s `resolveEmbedder()` satisfies this shape structurally,
 * so the app layer passes it straight through; tests inject the deterministic fake.
 *
 * The model id is part of the shape because an embedding is only comparable to others produced by
 * the same model, and the stored row records which one produced it.
 */
export type InterestEmbedder = {
  readonly model: string;
  embed(text: string): Promise<number[]>;
};

/** Everything {@link setMemberInterests} needs. The member comes from the session, never a payload. */
export type SetMemberInterestsArgs = {
  /** The Better Auth user id of the member whose selection this is. */
  memberId: string;
  /**
   * The chosen topic slugs, already validated by `MemberInterestsSchema` at the web boundary.
   * **Empty is a real selection**, not a missing one: the picker is skippable, and submitting
   * nothing means "this member has no interests" — which this function must record faithfully
   * rather than treat as a no-op.
   */
  topicSlugs: readonly string[];
  embedder: InterestEmbedder;
};

/** The full curated taxonomy, in the order the picker should render it. */
export async function listTopics(db: Db): Promise<Topic[]> {
  return db
    .select({ slug: topics.slug, label: topics.label })
    .from(topics)
    .orderBy(asc(topics.sortOrder), asc(topics.slug));
}

/**
 * A member's current selection, in the same order {@link listTopics} returns — so a picker
 * rehydrating an existing selection renders chips in the designed order rather than in insert
 * order.
 */
export async function getMemberInterests(db: Db, memberId: string): Promise<Topic[]> {
  return db
    .select({ slug: topics.slug, label: topics.label })
    .from(memberInterests)
    .innerJoin(topics, eq(topics.slug, memberInterests.topicSlug))
    .where(eq(memberInterests.memberId, memberId))
    .orderBy(asc(topics.sortOrder), asc(topics.slug));
}

/**
 * Replace a member's interests and the vector derived from them.
 *
 * **Replace, not merge.** The picker submits a whole selection, so this call is the complete
 * truth about what the member wants: topics they dropped must actually go. Re-submitting the same
 * selection is a no-op, which is what makes a double-submitted Continue button harmless.
 *
 * ## Ordering, because there is no transaction to hold this together
 *
 * Neither driver can span statements atomically (Neon's HTTP driver has no interactive
 * transactions, PGlite has no batch — see `queries/observations.ts`), so this is two statements,
 * each atomic in itself, ordered so a failure between them leaves a coherent state:
 *
 * 1. The **rows** — the member's stated selection, and the durable fact.
 * 2. The **vector** — a projection of that fact, recomputable from it at any time.
 *
 * A failure after the rows land leaves a selection whose vector is stale or absent; the call is
 * idempotent, so a retry converges. Writing the vector first would let the derived artifact
 * outrun the fact it derives from — the same ordering rule `commitCreatorProfile` follows when it
 * writes the profile before its embedding.
 *
 * Embedding happens **before** either write, so an embedder outage leaves storage untouched
 * rather than half-updated.
 */
export async function setMemberInterests(db: Db, args: SetMemberInterestsArgs): Promise<void> {
  const { memberId, topicSlugs, embedder } = args;
  const slugs = [...topicSlugs];

  if (slugs.length === 0) {
    // Skipping is a supported outcome, and "no interests" is a state the ranking path is built to
    // handle. Clear both halves so nothing personalizes off a selection the member abandoned.
    await db.delete(memberInterests).where(eq(memberInterests.memberId, memberId));
    await db
      .delete(embeddings)
      .where(and(eq(embeddings.sourceType, "interest"), eq(embeddings.sourceId, memberId)));
    return;
  }

  // Resolve labels here rather than trusting the slugs: it is the same read that proves every
  // slug names a real topic, and an unknown one has to surface as a typed error rather than as an
  // opaque foreign-key violation from the driver (the precedent `followCreator` sets for
  // `follow_self`).
  const rows = await db
    .select({ slug: topics.slug, label: topics.label, sortOrder: topics.sortOrder })
    .from(topics)
    .where(inArray(topics.slug, slugs))
    .orderBy(asc(topics.sortOrder), asc(topics.slug));
  if (rows.length !== slugs.length) {
    const known = new Set(rows.map((r) => r.slug));
    const unknown = slugs.filter((s) => !known.has(s));
    throw new ResonanceError(
      "unknown_topic",
      `Unknown topic slug(s): ${unknown.join(", ")}. Topics are curated; pick from listTopics().`,
    );
  }

  // The LABELS are embedded, not the slugs: the creator side embeds human prose, so the two
  // vectors are only comparable if this side does too ("Tea Culture", not "tea-culture"). Sorted
  // by the taxonomy's own order, so the same selection always produces the same content string
  // and therefore the same vector — a re-submission is then genuinely a no-op.
  const content = rows.map((r) => r.label).join(", ");
  const embedding = await embedder.embed(content);

  // ── 1. The rows. One statement: the DELETE clears only topics that are NOT in the new
  // selection, so it and the INSERT touch disjoint rows and can share a statement without either
  // fighting the other over the same key.
  const removal = db
    .delete(memberInterests)
    .where(
      and(eq(memberInterests.memberId, memberId), notInArray(memberInterests.topicSlug, slugs)),
    );
  const insertion = db
    .insert(memberInterests)
    .values(slugs.map((topicSlug) => ({ memberId, topicSlug })))
    .onConflictDoNothing();
  await db.execute(sql`with removed as (${removal.getSQL()}) ${insertion.getSQL()}`);

  // ── 2. The vector. Also one statement, and the same disjoint-rows trick: the DELETE prunes any
  // interest row written under a DIFFERENT model, the upsert owns the row for this one. Together
  // they make "a member has exactly one interest vector" true by construction, which is what lets
  // getMemberInterestEmbedding read one row without having to choose between two models.
  const prune = db
    .delete(embeddings)
    .where(
      and(
        eq(embeddings.sourceType, "interest"),
        eq(embeddings.sourceId, memberId),
        ne(embeddings.model, embedder.model),
      ),
    );
  const upsert = db
    .insert(embeddings)
    .values({
      sourceType: "interest",
      sourceId: memberId,
      model: embedder.model,
      content,
      embedding,
    })
    .onConflictDoUpdate({
      target: [embeddings.sourceType, embeddings.sourceId, embeddings.model],
      set: { content, embedding },
    });
  await db.execute(sql`with pruned as (${prune.getSQL()}) ${upsert.getSQL()}`);
}

/**
 * The member's stored interest vector, or `null` if they have none.
 *
 * `null` is the honest answer for a member who skipped the picker, and the discovery adapter
 * turns it into an empty page rather than an unranked dump of the corpus (`DiscoveryPort`
 * invariant 8). The width is not checked here — `searchCreatorProfiles` asserts it at the seam
 * where a wrong-width vector would otherwise silently match nothing.
 */
export async function getMemberInterestEmbedding(
  db: Db,
  memberId: string,
): Promise<number[] | null> {
  const [row] = await db
    .select({ embedding: embeddings.embedding })
    .from(embeddings)
    .where(and(eq(embeddings.sourceType, "interest"), eq(embeddings.sourceId, memberId)))
    .limit(1);
  return row?.embedding ?? null;
}
