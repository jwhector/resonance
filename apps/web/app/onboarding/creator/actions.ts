"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  CommitProfileInputSchema,
  InterviewMessageSchema,
  type CreatorProfileDraft,
} from "@resonance/core";
import {
  commitCreatorProfile,
  profileGenAgent,
  resolveEmbedder,
  runAgentStructured,
} from "@resonance/ai";
import { getSession } from "@resonance/auth";
import { createDb } from "@resonance/db";

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

  // Under RESONANCE_FAKES the shared model is text-only and can't satisfy profile-gen's forced
  // tool call, so inject a deterministic canned model (dynamically imported so `ai/test` stays
  // out of the production path). Production passes no model → the runner routes to the Gateway.
  const model =
    process.env.RESONANCE_FAKES === "1"
      ? (await import("../../../lib/fake-profile-model")).createFakeProposeModel(messages)
      : undefined;

  const { output } = await runAgentStructured(profileGenAgent, { messages, model });
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
      embedder: resolveEmbedder(),
    },
    commit,
  );

  redirect(`/creator/${profileId}`);
}
