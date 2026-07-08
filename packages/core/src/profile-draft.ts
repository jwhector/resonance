import { z } from "zod";

/**
 * The editable draft of a creator profile produced by the Weave interview.
 *
 * The shared generated-draft contract spoken by three packages — `@resonance/ai`
 * (ProfileGen generates it, server-side), `apps/web` (the "put on profile" Server Action
 * validates the commit payload, server-side), and `@resonance/ui` (renders and edits it,
 * CLIENT). Because `@resonance/ai` is server-only and must never ship to the client, this
 * cross-cutting shape lives here (ADR-0003), not in any one consumer — exactly like
 * `InterviewMessageSchema`.
 *
 * It is distinct from `ai`'s server-side `ProfileGenSchema` (the generation output): the
 * draft the user edits shows a few AI-generated *name candidates* that collapse to a single
 * chosen name on commit, and it carries no offerings (the design has no offerings editor,
 * and `OfferingSchema` lives in `@resonance/db`, which core must not depend on — design spec
 * § Increment 2 / Creator Onboarding).
 */

// Shared field schemas — one home for each limit so the draft and the commit payload can
// never drift. Lengths mirror `ai`'s ProfileGenSchema so generation and edit agree.
const displayNameSchema = z.string().min(1).max(120);
const headlineSchema = z.string().min(1).max(200);
const bioSchema = z.string().min(1).max(5000);
const tagsSchema = z.array(z.string().min(1)).max(20);

/**
 * One AI-generated creator-name candidate: a proposed name plus a short blurb explaining it.
 * The UI presents up to three; the user picks exactly one, which becomes `displayName` on
 * commit.
 */
export const NameOptionSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(280),
});

export type NameOption = z.infer<typeof NameOptionSchema>;

/**
 * The generated draft as it exists while the user edits it, before committing. Holds the
 * candidate names (1–3) alongside the editable headline, bio, and tags. Produced by
 * `@resonance/ai`, rendered/edited by `@resonance/ui`.
 */
export const CreatorProfileDraftSchema = z.object({
  nameOptions: z.array(NameOptionSchema).min(1).max(3),
  headline: headlineSchema,
  bio: bioSchema,
  tags: tagsSchema,
});

export type CreatorProfileDraft = z.infer<typeof CreatorProfileDraftSchema>;

/**
 * The payload `apps/web`'s "put on profile" Server Action validates: the single chosen name
 * (collapsed from `nameOptions`) plus the possibly-edited fields. Reuses the draft's field
 * schemas so limits stay identical across generate → edit → commit.
 */
export const CommitProfileInputSchema = z.object({
  displayName: displayNameSchema,
  headline: headlineSchema,
  bio: bioSchema,
  tags: tagsSchema,
});

export type CommitProfileInput = z.infer<typeof CommitProfileInputSchema>;
