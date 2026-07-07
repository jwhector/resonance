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
  // One creator profile per user: makes createCreatorProfile idempotent (upsert on conflict),
  // so a model retry or profile regeneration updates the same row instead of duplicating it.
  (t) => [uniqueIndex("creator_profiles_user_id_uq").on(t.userId)],
);

// Generic, polymorphic vector store. sourceType is open-ended; only "creator_profile"
// is used in this slice. sourceId is the uuid of the source row.
export const EMBEDDING_SOURCE_TYPES = ["creator_profile", "offering", "post", "interest"] as const;
export const EmbeddingSourceTypeSchema = z.enum(EMBEDDING_SOURCE_TYPES);
export type EmbeddingSourceType = z.infer<typeof EmbeddingSourceTypeSchema>;

export const embeddings = pgTable(
  "embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceType: text("source_type").$type<EmbeddingSourceType>().notNull(),
    sourceId: uuid("source_id").notNull(),
    model: text("model").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }).notNull(),
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
