import { expect, test } from "@playwright/test";
import { deleteUserByEmail } from "./lib/db";
import { signUpAndVerify, skipInterests } from "./lib/signup";

/**
 * End-to-end Creator Onboarding flow (ADR-0013): the real passwordless front door →
 * Weave interview → ProfileGen draft → commit → published profile. Runs entirely under the
 * isolated E2E harness (`E2E_HARNESS=1`, set by `playwright.config.ts`), which selects the
 * deterministic fake model / mail / embedder at the app's composition roots (ADR-0018 §4) — so the
 * flow is deterministic and credential-free — against the real Neon DB.
 *
 * Robustness (ADR-0011): assert only on SETTLED state — role queries,
 * `toBeVisible`, `toHaveURL`, generous timeouts. Never assert on mid-stream tokens. The OTP is
 * pulled from the `E2E_HARNESS`-gated `/api/test/last-otp` seam, which reads the same fake-mail
 * singleton Better Auth writes the code to (see `@resonance/auth` `peekLoginCode`).
 */

/** The canned line the fake interview model streams (see @resonance/ai gateway fake). */
const CANNED_REPLY = "Thanks for sharing — what first drew you to this work?";

/**
 * Accounts this worker signed up, removed in `afterEach`.
 *
 * This spec is the one that **commits a creator profile**, so leaving its account behind does not
 * just leak a row — it leaks a published, embedded profile that ranks in every subsequent
 * discovery search. 70 of the dev database's 80 profiles were `New Creator` leftovers from this
 * test before the teardown existed, crowding real results off the first page.
 *
 * `afterEach` rather than a `finally` inside the test: Playwright aborts the test body on a
 * timeout, and a `finally` there never runs.
 */
let accounts: string[] = [];

test.afterEach(async () => {
  for (const email of accounts) await deleteUserByEmail(email);
  accounts = [];
});

test("creator can sign up, interview with Weave, generate + commit a profile", async ({
  page,
  request,
}) => {
  // 1) /start's "share" answer → /signup → /verify → the OTP from the test seam → signed in,
  //    standing on /interests. The answer is what carries this account to the interview rather
  //    than the member front door. Unique per run so re-runs never collide on Better Auth's
  //    one-account-per-email.
  accounts.push(await signUpAndVerify(page, request, "e2e-creator", { intent: "share" }));

  // 2) Interest selection sits between verification and the interview, for every new account.
  //    This spec is about the CREATOR path, so it skips the step —
  //    which the picker supports by design: Continue with nothing selected is a valid, empty
  //    selection. `interests.spec.ts` owns driving the picking path.
  await skipInterests(page, "share");

  // 3) Interview: the Weave rail renders. Send a turn; assert the assistant reply SETTLES.
  await expect(page.getByRole("region", { name: "Weave interview" })).toBeVisible();
  const composer = page.getByRole("textbox", { name: "Talk to Weave" });
  await composer.fill("I hand-throw stoneware mugs and bowls for everyday use.");
  await page.getByRole("button", { name: "Send to Weave" }).click();

  // The fake model streams one canned line — assert the settled text, not a partial token.
  await expect(page.getByText(CANNED_REPLY)).toBeVisible({ timeout: 20_000 });

  // 4) Generate the draft. The button enables after the first user turn.
  const generate = page.getByRole("button", { name: "Weave, build my profile" });
  await expect(generate).toBeEnabled();
  await generate.click();

  // ProfileDraftPanels appears — assert the 3 name options + headline + tags all render.
  await expect(page.getByRole("heading", { name: "Creator Name" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("New Creator")).toBeVisible();
  await expect(page.getByText("Weave Studio")).toBeVisible();
  await expect(page.getByText("The Maker")).toBeVisible();

  const headline = page.getByRole("textbox", { name: "Headline" });
  await expect(headline).toHaveValue("A creator sharing what they love");
  await expect(page.getByText("craft")).toBeVisible();
  await expect(page.getByText("community")).toBeVisible();

  // Edit the headline so we can prove the edit round-trips through commit → DB → render.
  const editedHeadline = "Hand-thrown stoneware for everyday tables";
  await headline.fill(editedHeadline);

  // 5) Commit → redirected to /creator/<id>. Assert the saved fields render.
  await page.getByRole("button", { name: "Good to go" }).click();

  await expect(page).toHaveURL(/\/creator\/[0-9a-f-]{36}/, { timeout: 25_000 });
  await expect(page.getByText("Profile published")).toBeVisible();
  // Default selected name is the first option.
  await expect(page.getByRole("heading", { name: "New Creator" })).toBeVisible();
  await expect(page.getByText(editedHeadline)).toBeVisible();
  // The bio the fake ProfileGen derives from the first interview turn.
  await expect(page.getByText(/hand-throw stoneware mugs and bowls/i)).toBeVisible();
  // Tags render as search keywords.
  await expect(page.getByText("craft")).toBeVisible();
  await expect(page.getByText("community")).toBeVisible();
});

test("unauthenticated visit to /onboarding/creator redirects to /signup", async ({ page }) => {
  // A fresh (isolated) Playwright context has no session cookie — the RSC auth gate must bounce.
  await page.goto("/onboarding/creator");
  await expect(page).toHaveURL(/\/signup/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Welcome to Resonance" })).toBeVisible();
});
