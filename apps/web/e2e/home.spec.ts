import { test, expect } from "@playwright/test";

// Smoke test — proves the app boots and the design system renders. The reference
// slice (ADR-0013) adds the real onboarding-flow E2E tests alongside this.
test("home page renders the Resonance landing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Resonance" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
});
