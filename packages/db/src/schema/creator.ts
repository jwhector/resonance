import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { EMBEDDING_DIMS } from "@resonance/core";
import { z } from "zod";
import { user } from "./auth";

export const OfferingSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
});
export type Offering = z.infer<typeof OfferingSchema>;

export const ProfileStatusSchema = z.enum(["draft", "ready"]);
export type ProfileStatus = z.infer<typeof ProfileStatusSchema>;

export const creatorProfiles = pgTable(
  "creator_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    headline: text("headline").notNull(),
    bio: text("bio").notNull(),
    tags: jsonb("tags")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    offerings: jsonb("offerings")
      .$type<Offering[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    status: text("status").$type<ProfileStatus>().notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [
    // One creator profile per user: makes createCreatorProfile idempotent (upsert on conflict),
    // so a model retry or profile regeneration updates the same row instead of duplicating it.
    uniqueIndex("creator_profiles_user_id_uq").on(t.userId),
    // Every discovery read filters `status = 'ready'` (drafts are never visible), so status is a
    // WHERE column on the hot path.
    index("creator_profiles_status_idx").on(t.status),
    // Tag filtering uses jsonb containment (`tags @> '[...]'`). jsonb_path_ops is the narrower,
    // faster GIN opclass and supports exactly the `@>` operator the tag filter issues.
    index("creator_profiles_tags_idx").using("gin", t.tags.op("jsonb_path_ops")),
  ],
);

// Generic, polymorphic vector store. sourceType is open-ended; "creator_profile" and
// "interest" are produced today. sourceId is the id of the source row, as text.
export const EMBEDDING_SOURCE_TYPES = ["creator_profile", "offering", "post", "interest"] as const;
export const EmbeddingSourceTypeSchema = z.enum(EMBEDDING_SOURCE_TYPES);
export type EmbeddingSourceType = z.infer<typeof EmbeddingSourceTypeSchema>;

export const embeddings = pgTable(
  "embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceType: text("source_type").$type<EmbeddingSourceType>().notNull(),
    // `text`, not `uuid`, because this column is polymorphic in ID SHAPE as well as in source.
    // A creator profile is addressed by a uuid, but a member's interest vector is keyed to their
    // Better Auth user id, which is text (auth mints string ids, not uuids). A uuid column can
    // hold one of those and not the other, so the widest of the two identifier types wins.
    //
    // The cost is that comparisons are now exact text comparisons rather than uuid-normalised
    // ones: a uuid-shaped source id must be stored in canonical lower-case hyphenated form, which
    // is what Postgres returns from a uuid column and therefore what every writer here already
    // passes. It is also why `searchCreatorProfiles` casts the profile id to text to join rather
    // than casting this column to uuid — casting the other way would raise a syntax error the
    // moment the planner touched a non-uuid source id, such as an interest row.
    sourceId: text("source_id").notNull(),
    model: text("model").notNull(),
    content: text("content").notNull(),
    // Width comes from @resonance/core so the column, the embedder, and the query-time guard
    // cannot drift apart (seed resonance-e0e6). Changing it there changes it here.
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMS }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("embeddings_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
    uniqueIndex("embeddings_source_model_uq").on(t.sourceType, t.sourceId, t.model),
  ],
);

// Row-shape Zod schema (boundary validation / inference for inserts).
export const CreatorProfileInputSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1).max(120),
  headline: z.string().min(1).max(200),
  bio: z.string().min(1).max(5000),
  tags: z.array(z.string().min(1)).max(20).default([]),
  offerings: z.array(OfferingSchema).max(20).default([]),
  status: ProfileStatusSchema.default("ready"),
});
export type CreatorProfileInput = z.infer<typeof CreatorProfileInputSchema>;
