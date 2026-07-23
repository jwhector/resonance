import { type CommitProfileInput, CommitProfileInputSchema, type Role } from "@resonance/core";
import { type Db, createCreatorProfile, setUserRoles, upsertProfileEmbedding } from "@resonance/db";
import type { Embedder } from "../../embeddings";

/**
 * Server context `commitCreatorProfile` needs — the authenticated principal plus the
 * data/embedding handles. None of it is model-supplied: the web layer assembles it from the
 * session after the user has picked a name and edited the draft (the canonical context-injection
 * pattern, design spec § Context injection pattern).
 */
export interface CommitProfileContext {
  /** The authenticated creator the profile belongs to. */
  userId: string;
  /** Their current roles (from the session), so the flip adds `creator` without a DB re-read. */
  currentRoles: Role[];
  db: Db;
  embedder: Embedder;
}

/** What `commitCreatorProfile` returns once the profile is persisted and embedded. */
export interface CommitProfileResult {
  profileId: string;
}

/**
 * Persist a creator profile from the user's committed draft. This is the explicit "put on
 * profile" step the web layer calls AFTER the interview generated a draft and the user reviewed,
 * edited, and picked a name — generation itself writes nothing. It proves the registry's
 * ai→db→matching path (ADR-0013): embed the profile text → write the profile row → write the
 * embedding row → flip the member into a creator.
 */
export async function commitCreatorProfile(
  ctx: CommitProfileContext,
  input: CommitProfileInput,
): Promise<CommitProfileResult> {
  // Validate at the boundary — the web layer hands us the commit payload after the user edited
  // the draft and chose a name; types are not validation (golden rule 4).
  const commit = CommitProfileInputSchema.parse(input);

  // No DB transaction wraps these writes: the production neon-http driver has no interactive
  // transactions (ADR-0004). Instead we order for atomicity — run the failure-prone external
  // embedding first (nothing is committed if Voyage fails), then the idempotent upserts (profile
  // keyed on user_id, embedding on (source,model)), and flip the role LAST so a member only
  // becomes a creator once a discoverable profile+embedding is durably persisted.
  const { model, content, embedding } = await ctx.embedder.embedProfile({
    displayName: commit.displayName,
    headline: commit.headline,
    bio: commit.bio,
    tags: commit.tags,
    // The commit payload carries no offerings — the onboarding UI has no offerings editor — so a
    // profile starts with an empty list (design spec § Increment 2 / Creator Onboarding).
    offerings: [],
  });

  const profile = await createCreatorProfile(ctx.db, {
    userId: ctx.userId,
    displayName: commit.displayName,
    headline: commit.headline,
    bio: commit.bio,
    tags: commit.tags,
    offerings: [],
    status: "ready",
  });

  await upsertProfileEmbedding(ctx.db, {
    profileId: profile.id,
    model,
    content,
    embedding,
  });

  // Additive: keep every existing role so a member becomes member+creator, never losing
  // membership. Runs LAST — see the atomicity ordering above.
  await setUserRoles(ctx.db, ctx.userId, [...ctx.currentRoles, "creator"]);

  return { profileId: profile.id };
}
