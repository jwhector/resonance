import { expect, test, type Page } from "@playwright/test";
import { readOnboardingSession } from "./lib/db";
import { deleteSignedUpAccounts, signUpAndVerify, skipInterests } from "./lib/signup";

/**
 * End-to-end staged creator onboarding (ADR-0022): the real passwordless front door → the
 * eleven-stage Weave interview → a generated, editable profile foundation → publish → the
 * Onboarded rail → Finish for now on the published profile.
 *
 * Runs under the isolated E2E harness (`E2E_HARNESS=1`, set by `playwright.config.ts`), which
 * injects the fixed fake foundation generator, embedder and mail at the composition roots
 * (ADR-0018 §4), against the real Neon database — so resume, persistence and the one-statement
 * publish are exercised for real.
 *
 * Assertions wait on settled state: the stage section's `data-stage` attribute changes only once
 * the Server Action has returned and the new model is rendered.
 */

/** A private answer, distinctive enough to search the stored session for after publishing. */
const ORIGIN_ANSWER = "My grandmother kept a night garden and let me name the moths";

/**
 * This spec publishes creator profiles, and a leftover account leaks a ready, embedded profile
 * into every later discovery search. The sign-up helper records each address as it is minted, so
 * `afterEach` can drain them even when a test times out mid-flow.
 */
test.afterEach(deleteSignedUpAccounts);

function stage(page: Page, name: string) {
  return page.locator(`section[data-stage="${name}"]`);
}

async function expectStage(page: Page, name: string): Promise<void> {
  await expect(stage(page, name)).toBeVisible({ timeout: 20_000 });
}

/** Answer a multiline stage through the bottom composer and send it. */
async function answerInComposer(page: Page, current: string, text: string): Promise<void> {
  await stage(page, current).getByRole("textbox", { name: "Talk to Weave" }).fill(text);
  await page.getByRole("button", { name: "Yes I’m ready" }).click();
}

async function reachCreatorOnboarding(
  page: Page,
  request: Parameters<typeof signUpAndVerify>[1],
): Promise<string> {
  // `/start`'s "share" answer is what routes a new account to the interview rather than the member
  // front door; interests are skipped because `interests.spec.ts` owns that path.
  const email = await signUpAndVerify(page, request, "e2e-creator", "share");
  await skipInterests(page, "share");
  await expectStage(page, "opening");
  return email;
}

test("creator completes the staged interview, resumes after reload, publishes and finishes", async ({
  page,
  request,
}) => {
  const email = await reachCreatorOnboarding(page, request);

  // Opening → name. The name is optional; skipping it must not block anything.
  await page.getByRole("button", { name: "Yes let’s begin" }).click();
  await expectStage(page, "creator_name");
  await page.getByRole("button", { name: "Skip" }).click();

  // Offering gates generation, so it offers no Skip.
  await expectStage(page, "offering");
  await expect(page.getByRole("button", { name: "Skip" })).toHaveCount(0);
  await answerInComposer(page, "offering", "Herbal blends and small dreamwork circles");

  await expectStage(page, "origin");
  await answerInComposer(page, "origin", ORIGIN_ANSWER);

  // Resume: a reload mid-interview lands on exactly the stage the creator reached, because the
  // session is server-side rather than in the browser.
  await expectStage(page, "intended_experience");
  await page.reload();
  await expectStage(page, "intended_experience");

  await answerInComposer(page, "intended_experience", "Slower, calmer and more reflective");

  await expectStage(page, "resonance_moment");
  await page.getByRole("button", { name: "Skip" }).click();
  await expectStage(page, "resonant_people");
  await page.getByRole("button", { name: "Skip" }).click();

  // Expression style: a keyboard-operable radio group.
  await expectStage(page, "expression_style");
  await page.getByRole("radio", { name: "Dreamy & Reflective" }).check();
  await page.getByRole("button", { name: "Good to go" }).click();

  // Summary → generation → the editable foundation.
  await expectStage(page, "summary");
  await page.getByRole("button", { name: "Yes I’m ready" }).click();
  await expectStage(page, "foundation");

  // The generated foundation is saved before the creator touches it, so a reload keeps it.
  await page.reload();
  await expectStage(page, "foundation");

  const foundation = stage(page, "foundation");
  await expect(foundation.getByRole("heading", { name: "Creator Name" })).toBeVisible();
  await expect(foundation.getByText("Revise with Weave")).toHaveCount(0);
  await foundation.getByRole("radio", { name: /Night Bloom Collective/ }).check();

  const headline = foundation.getByRole("textbox", { name: "Headline" });
  await expect(headline).toHaveValue(
    "Dreamwork and herbal reflection for slower inner connection.",
  );
  const editedHeadline = "Night-garden herbal circles for slower evenings";
  await headline.fill(editedHeadline);

  await foundation.getByRole("textbox", { name: "New search keyword" }).fill("moth gardens");
  await foundation.getByRole("button", { name: "Add tag" }).click();
  await expect(foundation.getByText("moth gardens")).toBeVisible();

  // Publish → the Onboarded rail.
  await page.getByRole("button", { name: "Good to go" }).click();
  await expectStage(page, "completion");

  const rail = stage(page, "completion");
  await expect(rail.getByRole("region", { name: "Your published profile" })).toContainText(
    "Night Bloom Collective",
  );
  // The unbuilt next steps are offered honestly: present, disabled, and labelled as coming soon.
  for (const name of [/profile image/i, /cover image/i, /refine/i]) {
    await expect(rail.getByRole("button", { name })).toHaveAttribute("aria-disabled", "true");
  }
  await expect(rail.getByText("Coming soon").first()).toBeVisible();

  // Privacy: the stored session no longer holds any interview answer or the draft.
  const stored = await readOnboardingSession(email);
  expect(stored?.state).toMatchObject({ status: "completed" });
  expect(stored?.state).not.toHaveProperty("slots");
  expect(stored?.state).not.toHaveProperty("draft");
  expect(JSON.stringify(stored?.state)).not.toContain(ORIGIN_ANSWER);

  // A completed interview reopens on the rail rather than restarting.
  await page.reload();
  await expectStage(page, "completion");

  // Finish for now → the published profile, carrying the creator's edits.
  await page.getByRole("button", { name: "Finish for now" }).click();
  await expect(page).toHaveURL(/\/creator\/[0-9a-f-]{36}/, { timeout: 25_000 });
  await expect(page.getByRole("heading", { name: "Night Bloom Collective" })).toBeVisible();
  await expect(page.getByText(editedHeadline)).toBeVisible();
  await expect(page.getByText("moth gardens")).toBeVisible();
});

test("“I want to do it later” leaves onboarding and the invitation is still waiting", async ({
  page,
  request,
}) => {
  await reachCreatorOnboarding(page, request);

  await page.getByRole("button", { name: "I want to do it later" }).click();
  await expect(page).not.toHaveURL(/\/onboarding\/creator/, { timeout: 20_000 });

  await page.goto("/onboarding/creator");
  await expectStage(page, "opening");
  await expect(page.getByRole("button", { name: "Yes let’s begin" })).toBeVisible();
});

test("unauthenticated visit to /onboarding/creator redirects to /signup", async ({ page }) => {
  // A fresh Playwright context has no session cookie — the RSC auth gate must bounce.
  await page.goto("/onboarding/creator");
  await expect(page).toHaveURL(/\/signup/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Welcome to Resonance" })).toBeVisible();
});
