import { z } from "zod";

/**
 * What someone said they came here to do, chosen on the first onboarding screen
 * (Onboarding/Creator/WhatBroughtYou, Figma `1519:78312`).
 *
 * This module owns the **vocabulary** only — the three answers the screen offers. It owns
 * neither where each answer routes (the web shell maps that, and the map differs by screen)
 * nor how the answer is stored (`@resonance/db` owns the column).
 *
 * It lives here because four boundaries have to agree on the same three values and none of
 * them can import each other: `@resonance/ui` renders the picker, `apps/web` parses the
 * answer back off a URL, `@resonance/db` persists it, and analytics reads it later.
 */

/**
 * The intents, in the order the screen presents them.
 *
 * Exported as a value, not just a type, so a caller can iterate the full set — rendering one
 * control per intent, or asserting a routing map covers every case — without restating the
 * list and letting it drift from this one.
 */
export const ONBOARDING_INTENTS = ["explore", "share", "business"] as const;

/**
 * A closed enum, and deliberately so: this value is read back off a URL where anyone can
 * type anything, and a closed set means an unrecognized value is simply *not an intent*
 * rather than something a caller has to sanitize. It is never used as a redirect target, so
 * it carries none of the open-redirect surface a next-URL parameter would.
 *
 * Callers parsing untrusted input should reach for `safeParse` — an absent or unrecognized
 * intent is an ordinary outcome (someone reached signup directly), not an exception.
 */
export const OnboardingIntentSchema = z.enum(ONBOARDING_INTENTS);
export type OnboardingIntent = z.infer<typeof OnboardingIntentSchema>;

/**
 * Whether an intent means the person came here to create rather than to browse.
 *
 * Two of the three answers are creator intents, and every caller that forks on this would
 * otherwise re-derive that grouping — a check that silently becomes wrong the day a fourth
 * intent is added. Note this asks about **stated intent**, never about status: someone is a
 * creator once they have completed creator onboarding, which is what the `creator` role
 * records. This function cannot answer that and must not be used to.
 */
export function isCreatorIntent(intent: OnboardingIntent): boolean {
  return intent === "share" || intent === "business";
}
