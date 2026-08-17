"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { IntentPickerCard, type OnboardingIntent } from "@resonance/ui";
import { signupUrl } from "../intent-routes";

/**
 * Where each intent lands. The two creator intents (`share`, `business`) enter the existing
 * magic-link → interview flow at `/signup` **carrying the answer**, which is what lets the fork
 * after email verification tell the two paths apart. The member intent (`explore`) lands on
 * `/discover`, the member front door.
 *
 * `/discover` is **session-optional**, so `explore` deliberately does not detour through
 * `/signup`: a member can search, get ranked creators and open a profile before ever having
 * an account — signing in is what the Follow control asks for, not what the door demands.
 * That is also why the absence of an intent later on reads as a member: no answer ever reaches
 * sign-up except a creator's.
 */
const DESTINATIONS: Record<OnboardingIntent, Route> = {
  explore: "/discover" as Route,
  share: signupUrl("share"),
  business: signupUrl("business"),
};

/**
 * Client wrapper over the presentational `IntentPickerCard`. Owns only the fork: it maps
 * the chosen intent to a route and navigates. No auth, no data — the routing decision
 * lives here in the shell, not in the design-system component.
 */
export function IntentForm() {
  const router = useRouter();
  return <IntentPickerCard onSubmit={(intent) => router.push(DESTINATIONS[intent])} />;
}
