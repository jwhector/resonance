import {
  createCreatorOnboardingService,
  snapshotV1CreatorOnboardingBehavior,
  type CreatorOnboardingService,
  type CreatorOnboardingView,
} from "@resonance/ai";
import { createCreatorOnboardingStore, createDb, getCreatorProfileByUserId } from "@resonance/db";
import { onboardingEmbedder, onboardingFoundationGenerator } from "../../../../lib/e2e-harness";

/**
 * The creator-onboarding composition root, shared by the page (open/resume) and the Server
 * Action (transition): the snapshot-v1 behaviour, the database store and the foundation generator
 * wired into `@resonance/ai`'s service. Composition only — every stage rule, save and commit lives
 * behind the service (ADR-0022).
 *
 * `createDb()` is called per request, inside the function, so `next build` never needs a live
 * database.
 */
export async function creatorOnboardingService(): Promise<CreatorOnboardingService> {
  const db = createDb();
  return createCreatorOnboardingService({
    behavior: snapshotV1CreatorOnboardingBehavior,
    store: createCreatorOnboardingStore({ db, embedder: await onboardingEmbedder() }),
    generateFoundation: await onboardingFoundationGenerator(),
    newSessionId: () => crypto.randomUUID(),
    // The creator only ever sees "try again"; this is the one place a failed model call — a
    // revoked key, a provider outage — becomes visible to whoever runs the app. The report
    // carries the failure and the session id, never an answer.
    onGenerationFailed: (failure) =>
      console.error("creator onboarding: foundation generation failed", failure),
  });
}

/**
 * What the browser receives: the service's view, plus where Finish for now leads once the profile
 * is published. The profile id is a routing detail, so it is resolved here rather than carried by
 * the onboarding contract.
 */
export type OnboardingClientView = CreatorOnboardingView & { profileId: string | null };

export async function toClientView(
  view: CreatorOnboardingView,
  userId: string,
): Promise<OnboardingClientView> {
  if (view.status !== "completed") return { ...view, profileId: null };
  const profile = await getCreatorProfileByUserId(createDb(), userId);
  return { ...view, profileId: profile?.id ?? null };
}
