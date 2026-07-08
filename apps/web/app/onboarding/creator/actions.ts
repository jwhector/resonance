"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CommitProfileInputSchema,
  InterviewMessageSchema,
  type CreatorProfileDraft,
} from "@resonance/core";
import { commitCreatorProfile, profileGenAgent, runAgentStructured } from "@resonance/ai";
import { getSession } from "@resonance/auth";
import { createDb } from "@resonance/db";
import { onboardingEmbedder, onboardingModelOverride } from "../../../lib/e2e-harness";

/**
 * Server Actions wiring the creator-onboarding flow: `ui` (the client interview) → `ai` (draft
 * generation + commit) → `db` (persist), all behind creator auth. Every input is Zod-validated
 * at this boundary (golden rule 4); AI orchestration + the DB client stay server-side (the
 * `"use server"` directive), and `createDb()` is called lazily inside the action so `next build`
 * never needs a live database.
 */

const GenerateDraftInputSchema = z.object({
  messages: z.array(InterviewMessageSchema).min(1),
});

/**
 * Turn the interview transcript into an editable `CreatorProfileDraft` via ProfileGen. Writes
 * nothing — generation is pure; the explicit commit below is what persists. Auth-gated as
 * defence-in-depth on top of the interview page's own gate.
 */
export async function generateDraft(input: unknown): Promise<CreatorProfileDraft> {
  const { messages } = GenerateDraftInputSchema.parse(input);

  const user = await getSession(await headers());
  if (!user) redirect("/signup");

  // Live-by-default: no model is injected here, so the runner resolves the Gateway model
  // (`resolveModel`, ADR-0018). The `RunInput.model` DI seam stays open for tests, which pass a
  // fake model through it. The one shipped exception is the isolated E2E harness (ADR-0018 §4),
  // guarded so it can never activate in production.
  const { output } = await runAgentStructured(profileGenAgent, {
    messages,
    ...(await onboardingModelOverride()),
  });
  return output;
}

/**
 * The explicit "Good to go" commit: validate the edited draft, resolve the session, and hand
 * off to `commitCreatorProfile`, which embeds → writes the profile → writes the embedding →
 * adds the `creator` role (additive, so member→creator keeps membership). Redirects to the new
 * profile on success.
 */
export async function commitProfile(input: unknown): Promise<void> {
  const commit = CommitProfileInputSchema.parse(input);

  const user = await getSession(await headers());
  if (!user) throw new Error("Not authenticated: sign in before publishing a profile.");

  const { profileId } = await commitCreatorProfile(
    {
      userId: user.id,
      currentRoles: user.roles,
      db: createDb(),
      // Live-by-default embedder (`resolveEmbedder`, ADR-0018); under the isolated E2E harness this
      // resolves the deterministic fake instead (ADR-0018 §4), never active in production.
      embedder: await onboardingEmbedder(),
    },
    commit,
  );

  redirect(`/creator/${profileId}`);
}
