import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { assertAiConfigured } from "@resonance/ai";
import { getWebSession } from "../../../../lib/auth";
import { onboardingAiCheckEnabled } from "../../../../lib/e2e-harness";
import { OnboardingClient } from "./onboarding-client";
import { creatorOnboardingService, toClientView } from "./onboarding";

/**
 * `/onboarding/creator` — the staged Weave interview (ADR-0022). Auth-gated RSC: it resolves the
 * session server-side, bounces anonymous visitors to `/signup`, and resumes the creator's
 * interview exactly where they left it — or starts one — before any client code runs. A completed
 * interview renders its Onboarded rail.
 *
 * The 80px app rail comes from the shared `(app)` layout, so `<main>` here is just the surface
 * beside it.
 */
export default async function CreatorOnboardingPage() {
  const user = await getWebSession(await headers());
  if (!user) redirect("/signup");

  // Refuse to start unless the model AND embedding providers are jointly configured, so a partial
  // config fails here rather than at generation or publish (ADR-0018). Presence-only, no live
  // call; skipped under the E2E harness, whose providers are injected fakes.
  if (onboardingAiCheckEnabled()) assertAiConfigured();

  const service = await creatorOnboardingService();
  const initial = await toClientView(await service.open({ userId: user.id }), user.id);

  return (
    <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <OnboardingClient initial={initial} />
    </main>
  );
}
