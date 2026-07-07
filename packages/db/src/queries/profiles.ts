import { cosineDistance, desc, eq, sql } from "drizzle-orm";
import { ResonanceError } from "@resonance/core";
import { creatorProfiles, embeddings, type CreatorProfileInput } from "../schema/creator";
import type { Db } from "../types";

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

export async function findSimilarProfiles(
  db: Db,
  embedding: number[],
  limit = 10,
): Promise<Array<{ id: string; displayName: string; headline: string; similarity: number }>> {
  const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, embedding)})`;
  return (
    db
      .select({
        id: creatorProfiles.id,
        displayName: creatorProfiles.displayName,
        headline: creatorProfiles.headline,
        similarity,
      })
      .from(embeddings)
      // innerJoin intentionally excludes profiles that have no embedding row yet
      .innerJoin(creatorProfiles, eq(creatorProfiles.id, embeddings.sourceId))
      .where(eq(embeddings.sourceType, "creator_profile"))
      .orderBy(desc(similarity))
      .limit(limit)
  );
}
