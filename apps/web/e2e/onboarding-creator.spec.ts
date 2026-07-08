import { type Page, expect, test } from "@playwright/test";

/**
 * End-to-end Creator Onboarding flow (ADR-0013): the real passwordless front door →
 * Weave interview → ProfileGen draft → commit → published profile. Runs entirely under
 * `RESONANCE_FAKES=1` (fake model / mail / embedder) against the real Neon DB, so it is
 * deterministic and credential-free.
 *
 * Robustness (ADR-0011 / plan risk R5): assert only on SETTLED state — role queries,
 * `toBeVisible`, `toHaveURL`, generous timeouts. Never assert on mid-stream tokens. The OTP is
 * pulled from the RESONANCE_FAKES-gated `/api/test/last-otp` seam, which reads the same fake-mail
 * singleton Better Auth writes the code to (see `@resonance/auth` `peekLoginCode`).
 */

/** The canned line the fake interview model streams (see @resonance/ai gateway fake). */
const CANNED_REPLY = "Thanks for sharing — what first drew you to this work?";

/** Fill the 6 OTP cells one digit at a time (each cell is labelled "Digit N of 6"). */
async function enterOtp(page: Page, otp: string) {
  for (let i = 0; i < otp.length; i++) {
    await page.getByLabel(`Digit ${i + 1} of 6`).fill(otp[i]!);
  }
}

test("creator can sign up, interview with Weave, generate + commit a profile", async ({
  page,
  request,
}) => {
  // Unique per run so re-runs never collide on Better Auth's one-account-per-email.
  const email = `e2e-creator-${Date.now()}@example.com`;

  // 1) /signup — enter email, consent, submit. Lands on /verify.
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Welcome to Resonance" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/verify/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Check your email to continue" })).toBeVisible();

  // 2) Fetch the fake OTP from the test seam (poll until the async send has landed), enter it,
  //    submit → session cookie is set → redirect to the creator interview.
  let otp = "";
  await expect
    .poll(
      async () => {
        const res = await request.get(`/api/test/last-otp?email=${encodeURIComponent(email)}`);
        if (!res.ok()) return null;
        const body = (await res.json()) as { otp: string | null };
        otp = body.otp ?? "";
        return body.otp;
      },
      { timeout: 15_000 },
    )
    .toMatch(/^\d{6}$/);

  await enterOtp(page, otp);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/onboarding\/creator/, { timeout: 20_000 });

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
