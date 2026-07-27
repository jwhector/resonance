import { eq } from "drizzle-orm";
import { ResonanceError } from "@resonance/core";
import { creatorProfiles, embeddings, type CreatorProfileInput } from "../schema/creator";
import type { Db } from "../types";
import { searchCreatorProfiles } from "./discovery";

export type CreatorProfileRow = typeof creatorProfiles.$inferSelect;

export async function createCreatorProfile(
  db: Db,
  input: CreatorProfileInput,
): Promise<CreatorProfileRow> {
  // Idempotent on the unique (user_id) index: a retry or regeneration updates the existing
  // profile in place (same id) rather than inserting a duplicate.
  const [row] = await db
    .insert(creatorProfiles)
    .values(input)
    .onConflictDoUpdate({
      target: creatorProfiles.userId,
      set: {
        displayName: input.displayName,
        headline: input.headline,
        bio: input.bio,
        tags: input.tags,
        offerings: input.offerings,
        status: input.status,
        updatedAt: new Date(),
      },
    })
    .returning();
  if (!row)
    throw new ResonanceError("db_insert_no_row", "createCreatorProfile: insert returned no row");
  return row;
}

export async function getCreatorProfileById(
  db: Db,
  id: string,
): Promise<CreatorProfileRow | undefined> {
  const [row] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.id, id)).limit(1);
  return row;
}

/**
 * Look a creator profile up by the **user** who owns it, not by the profile's own uuid.
 *
 * The by-id lookup is not enough for any surface reached from a session or a follow edge: both
 * carry a Better Auth user id, and `/creator/[id]` documented the gap explicitly. The unique index
 * on `user_id` makes this a single-row read, and it is the same index `createCreatorProfile`
 * upserts against — so "one profile per user" is enforced and relied on in one place.
 */
export async function getCreatorProfileByUserId(
  db: Db,
  userId: string,
): Promise<CreatorProfileRow | undefined> {
  const [row] = await db
    .select()
    .from(creatorProfiles)
    .where(eq(creatorProfiles.userId, userId))
    .limit(1);
  return row;
}

export async function upsertProfileEmbedding(
  db: Db,
  args: { profileId: string; model: string; content: string; embedding: number[] },
): Promise<void> {
  await db
    .insert(embeddings)
    .values({
      sourceType: "creator_profile",
      sourceId: args.profileId,
      model: args.model,
      content: args.content,
      embedding: args.embedding,
    })
    .onConflictDoUpdate({
      target: [embeddings.sourceType, embeddings.sourceId, embeddings.model],
      set: { content: args.content, embedding: args.embedding },
    });
}

/**
 * ANN search over committed creator profiles, ranked by cosine similarity.
 *
 * **Only `status = "ready"` profiles are visible.** A draft is a profile mid-generation that
 * its owner has not published; surfacing one in discovery leaks unfinished work to strangers.
 *
 * A **thin wrapper** over {@link searchCreatorProfiles}, not a second query. The signature and
 * result shape are frozen: `scripts/verify-live.mjs` proves a committed profile landed by reading
 * it back through this exact call (ADR-0018 live-smoke, mulch `mx-880c8a`), and that path is
 * credential-gated so CI would not catch a break. Delegating means the smoke gate and product
 * discovery exercise one implementation with one set of invariants — nothing to drift.
 *
 * New callers should use `searchCreatorProfiles`, which returns the full result row (userId,
 * tags, follow state) and supports filtering and pagination.
 */
export async function findSimilarProfiles(
  db: Db,
  embedding: number[],
  limit = 10,
): Promise<Array<{ id: string; displayName: string; headline: string; similarity: number }>> {
  const { results } = await searchCreatorProfiles(db, { embedding, limit });
  return results.map((r) => ({
    id: r.profileId,
    displayName: r.displayName,
    headline: r.headline,
    similarity: r.similarity,
  }));
}
