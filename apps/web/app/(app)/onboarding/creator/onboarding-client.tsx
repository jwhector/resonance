"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { CreatorOnboardingAction, TransitionInput } from "@resonance/core";
import { CreatorOnboardingStage } from "@resonance/ui";
import { transitionCreatorOnboarding } from "./actions";
import type { OnboardingClientView } from "./onboarding";

/**
 * The interactive half of `/onboarding/creator`: holds the latest view, sends each action to the
 * Server Action, and renders whatever comes back. It decides nothing about the interview — which
 * stage follows, what is required, when to generate — because the server already did.
 *
 * Each press gets a fresh idempotency key and echoes the revision it was drawn from, so a double
 * click or a retried request is refused as stale rather than applied twice.
 */

/** What to tell the creator when a transition did not simply advance. */
const NOTICE_MESSAGES: Record<NonNullable<OnboardingClientView["notice"]>, string | null> = {
  stale_revision: "Your interview moved on in another window, so here is where it is now.",
  required_input_missing: "Weave needs an answer here before it can build your profile.",
  invalid_input: "That answer didn’t fit. Please check it and try again.",
  unsupported_action: "That isn’t available at this step.",
  unavailable_action: "That isn’t available yet.",
  already_completed: null,
  generation_failed: "Weave couldn’t build your profile just now. Please try again.",
};

export function OnboardingClient({ initial }: { initial: OnboardingClientView }) {
  const router = useRouter();
  const [view, setView] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);

  async function handleAction(action: CreatorOnboardingAction, input?: TransitionInput) {
    setPending(true);
    setFailure(null);
    try {
      const next = await transitionCreatorOnboarding({
        action,
        expectedRevision: view.revision,
        idempotencyKey: crypto.randomUUID(),
        ...(input ? { input } : {}),
      });
      setView(next);
      // "I want to do it later" is saved like any other answer, then the creator leaves.
      if (action === "later" && next.notice === null) router.push("/");
    } catch {
      setFailure("We couldn’t save that just now. Please try again.");
    } finally {
      setPending(false);
    }
  }

  function handleFinish() {
    router.push(view.profileId ? `/creator/${view.profileId}` : "/discover");
  }

  const error = failure ?? (view.notice ? NOTICE_MESSAGES[view.notice] : null);
  const profile = view.committedProfile;

  return (
    <CreatorOnboardingStage
      className="min-h-0 flex-1"
      model={view.render}
      onAction={(action, input) => void handleAction(action, input)}
      onFinish={handleFinish}
      pending={pending}
      error={error}
      completionSummary={
        profile ? (
          <section aria-label="Your published profile" className="flex flex-col gap-2">
            <p className="text-body-lg font-bold text-foreground">{profile.displayName}</p>
            <p className="text-body-md text-foreground">{profile.headline}</p>
            {profile.tags.length > 0 ? (
              <p className="text-body-md text-muted">{profile.tags.join(" · ")}</p>
            ) : null}
          </section>
        ) : undefined
      }
    />
  );
}
