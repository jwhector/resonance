import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { assertAiConfigured } from "@resonance/ai";
import { getWebSession } from "../../../../lib/auth";
import { onboardingAiCheckEnabled } from "../../../../lib/e2e-harness";
import { InterviewClient } from "./interview-client";

/**
 * `/onboarding/creator` — the Weave interview → ProfileGen screen. Auth-gated RSC: it resolves
 * the session server-side and bounces anonymous visitors to `/signup`. All interactivity
 * (streaming chat, draft editing, commit) lives in the client wrapper it renders. Composition
 * only — every rule lives in the packages it wires (ADR-0002).
 *
 * The 80px app rail comes from the shared `(app)` layout, so `<main>` here is just the surface
 * beside it: a full-height flex column (`min-h-0` so the rail's inner scroll region can shrink)
 * rather than the `h-screen` box it was when this screen owned the whole row.
 */
export default async function CreatorInterviewPage() {
  const user = await getWebSession(await headers());
  if (!user) redirect("/signup");

  // Fail fast (seed resonance-2fdc): refuse to start the interview unless the AI providers are
  // JOINTLY configured (model AND embedding), so a partial config (e.g. ANTHROPIC without VOYAGE)
  // errors here rather than only at the commit-time embedding step. Presence-only check, no live
  // call; the interview→generate→commit flow is all downstream of this one entry (ADR-0018).
  // Skipped under the E2E harness, where the model + embedder are injected fakes (no real
  // credentials exist) — see `onboardingAiCheckEnabled` in `lib/e2e-harness.ts`.
  if (onboardingAiCheckEnabled()) assertAiConfigured();

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <InterviewClient />
    </main>
  );
}
