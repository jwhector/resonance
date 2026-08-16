import type { Route } from "next";
import { type OnboardingIntent, OnboardingIntentSchema } from "@resonance/core";

/**
 * The onboarding URLs that carry a stated intent — built in one place so they cannot disagree.
 *
 * What someone answers on `/start` has to survive a round trip through their email before
 * anything can act on it, and it makes that trip in the URL: through `/signup`, through whichever
 * verification channel they use, and into `/interests`, which records it and forks on it.
 *
 * There are **two** verification channels — the magic link and the 6-digit code — and they must
 * land on the same screen, or which one someone happened to use would change where they end up.
 * That is why the destination is a function here rather than a constant in each form: both
 * channels ask {@link interestsUrl} for it, so there is no second copy to drift.
 *
 * A closed three-value enum is safe to carry this way. It is never used as a redirect target, so
 * it has none of the open-redirect surface a next-URL parameter would, and the most a forged value
 * achieves is an onboarding path `/start` already offers to anyone who asks.
 */

/** The query parameter, named once so reading and writing it cannot disagree. */
const INTENT = "intent";

/**
 * Read an intent off untrusted input — a URL anyone can type, or an argument to a Server Action.
 *
 * Called wherever the value is about to be acted on: the screens that build the next URL from it,
 * and the action that stores it. Anything unrecognized reads as *no intent stated*, and an absent
 * answer and a forged one are deliberately indistinguishable from here on — both mean there is
 * nothing to act on, and neither is a reason to fail a request someone is in the middle of.
 */
export function readIntent(value: unknown): OnboardingIntent | undefined {
  const parsed = OnboardingIntentSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

/**
 * Account creation, carrying the answer that sent someone here.
 *
 * Only the creator intents travel this way: `explore` goes straight to `/discover`, which is
 * session-optional and needs no account.
 */
export function signupUrl(intent: OnboardingIntent): Route {
  return `/signup?${INTENT}=${intent}` as Route;
}

/**
 * The "check your email" step, for the person entering the 6-digit code.
 *
 * The magic link has no equivalent — Better Auth mails it and later redirects to the
 * `callbackURL` it was given — which is exactly why the intent has to be threaded here too.
 */
export function verifyUrl(email: string, intent?: OnboardingIntent): Route {
  const params = new URLSearchParams({ email });
  if (intent) params.set(INTENT, intent);
  return `/verify?${params}` as Route;
}

/**
 * Interest selection: where **both** verification channels land, and where the intent is finally
 * read, stored and acted on.
 *
 * Every newly verified account passes through here, member or creator — roles are additive, so a
 * creator is also a member and a personalized `/discover` comes from the same selection.
 */
export function interestsUrl(intent?: OnboardingIntent): Route {
  return (intent ? `/interests?${INTENT}=${intent}` : "/interests") as Route;
}
