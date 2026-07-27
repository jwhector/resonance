"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { IntentPickerCard, type OnboardingIntent } from "@resonance/ui";

/**
 * Where each intent lands. The two creator intents (`share`, `business`) enter the
 * existing magic-link → interview flow at `/signup`; the member intent (`explore`)
 * lands on `/discover`, the member front door built in Slice A (`pl-bbca`).
 *
 * `/discover` is **session-optional**, so `explore` deliberately does not detour through
 * `/signup`: a member can search, get ranked creators and open a profile before ever having
 * an account — signing in is what the Follow control asks for, not what the door demands.
 * (This slot pointed at the scaffold home `/` as an admitted placeholder until the screen
 * existed; cashing it in is what makes the slice reachable through the real front door.)
 */
const DESTINATIONS: Record<OnboardingIntent, Route> = {
  explore: "/discover" as Route,
  share: "/signup" as Route,
  business: "/signup" as Route,
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
