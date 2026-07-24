"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { IntentPickerCard, type OnboardingIntent } from "@resonance/ui";

/**
 * Where each intent lands. The two creator intents (`share`, `business`) enter the
 * existing magic-link → interview flow at `/signup`; the member intent (`explore`)
 * routes to the scaffold home as a placeholder until member discovery is built.
 */
const DESTINATIONS: Record<OnboardingIntent, Route> = {
  explore: "/" as Route,
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
