"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TransitionCommandSchema } from "@resonance/core";
import { getWebSession } from "../../../../lib/auth";
import { creatorOnboardingService, toClientView, type OnboardingClientView } from "./onboarding";

/**
 * The one Server Action behind the staged creator interview: every button the creator presses
 * arrives here as a `TransitionCommand`.
 *
 * The browser supplies only the command — the action, the revision it was looking at, an
 * idempotency key and any answer. Who the creator is comes from the server session, and which
 * behaviour runs comes from the session they already have; `TransitionCommandSchema` has no field
 * for either, so neither can be asserted from the request (ADR-0022). The command is parsed before
 * the session is read, so a malformed payload costs nothing.
 */
export async function transitionCreatorOnboarding(input: unknown): Promise<OnboardingClientView> {
  const command = TransitionCommandSchema.parse(input);

  const user = await getWebSession(await headers());
  if (!user) redirect("/signup");

  const actor = { userId: user.id };
  const service = await creatorOnboardingService();
  return toClientView(await service.transition(actor, command), user.id);
}
