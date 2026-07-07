import { type Role } from "@resonance/core";
import { type Db, createCreatorProfile, setUserRoles, upsertProfileEmbedding } from "@resonance/db";
import type { Embedder } from "../../embeddings";
import { type AgentDefinition, defineAgent } from "../../registry";
import { PROFILE_GEN_SYSTEM } from "./prompt";
import { ProfileGenSchema } from "./profile-gen.schema";

/** Opus — the heavy-generation tier (ADR-0009 model routing). Swappable via the Gateway. */
export const PROFILE_GEN_MODEL = "anthropic/claude-opus-4-8";

/**
 * Server context the `saveProfile` tool closes over — the authenticated principal plus the
 * data/embedding handles. None of it is model-supplied; this is the canonical
 * context-injection pattern for any tool that needs server state (design spec § Context
 * injection pattern).
 */
export interface ProfileGenContext {
  /** The authenticated creator the profile belongs to. */
  userId: string;
  /** Their current roles (from the session), so the flip adds `creator` without a DB re-read. */
  currentRoles: Role[];
  db: Db;
  embedder: Embedder;
}

/** What `saveProfile` returns once the profile is persisted and embedded. */
export interface SaveProfileResult {
  profileId: string;
}

/**
 * Build the ProfileGen agent bound to a request's server context. Its single `saveProfile`
 * tool is what proves the registry (ADR-0013): the handler writes the profile row, flips the
 * user into a creator, embeds the profile text, and writes the embedding row — the full
 * ai→db→matching path in one place.
 */
export function defineProfileGenAgent(ctx: ProfileGenContext): AgentDefinition<SaveProfileResult> {
  return defineAgent<SaveProfileResult>({
    id: "profile-gen",
    model: PROFILE_GEN_MODEL,
    system: PROFILE_GEN_SYSTEM,
    tools: [
      {
        name: "saveProfile",
        description:
          "Persist the finished creator profile. Call this exactly once to publish the profile you have written.",
        inputSchema: ProfileGenSchema,
        handler: async (raw): Promise<SaveProfileResult> => {
          // The AI SDK already validated `raw` against inputSchema; re-parse to recover the
          // narrowed type at this boundary (the registry handler receives `unknown`).
          const input = ProfileGenSchema.parse(raw);

          const profile = await createCreatorProfile(ctx.db, {
            userId: ctx.userId,
            displayName: input.displayName,
            headline: input.headline,
            bio: input.bio,
            tags: input.tags,
            offerings: input.offerings,
            status: "ready",
          });

          await setUserRoles(ctx.db, ctx.userId, [...ctx.currentRoles, "creator"]);

          const { model, content, embedding } = await ctx.embedder.embedProfile(input);
          await upsertProfileEmbedding(ctx.db, {
            profileId: profile.id,
            model,
            content,
            embedding,
          });

          return { profileId: profile.id };
        },
      },
    ],
  });
}
