import { type APIRequestContext, type Page, expect } from "@playwright/test";

/**
 * The real passwordless front door, driven the way a member drives it — shared by every spec that
 * needs a signed-in account.
 *
 * It is one helper rather than three copies because the front door has a *step* in it:
 * `/interests` sits between email verification and the rest of onboarding for every newly
 * verified account, so all three specs pass through it. Keeping the route names in one place
 * also makes changing where `/interests` continues to a single edit instead of three.
 *
 * The OTP comes from the `E2E_HARNESS`-gated `/api/test/last-otp` seam, which reads the same
 * fake-mail singleton Better Auth wrote the code to (ADR-0018 §4).
 */

/**
 * Where `/interests` continues to today.
 *
 * Deliberately the existing post-verification destination: member and creator cannot be told
 * apart at that point, because nothing in the app records who is a creator (see
 * `(onboarding)/interests/actions.ts`).
 */
export const AFTER_INTERESTS = /\/onboarding\/creator/;

/** Fill the 6 OTP cells one digit at a time (each cell is labelled "Digit N of 6"). */
export async function enterOtp(page: Page, otp: string): Promise<void> {
  for (let i = 0; i < otp.length; i++) {
    await page.getByLabel(`Digit ${i + 1} of 6`).fill(otp[i]!);
  }
}

/**
 * Sign a brand-new account up and verify its email, stopping **on `/interests`** — the step every
 * newly verified account now lands on. The caller decides what to do there: pick topics, or skip
 * with {@link skipInterests}.
 *
 * Returns the generated email so the caller can delete the account afterwards
 * (`deleteUserByEmail`). `prefix` should name the spec, and the caller's run id keeps parallel
 * workers off each other's accounts — Better Auth allows one account per email.
 */
export async function signUpAndVerify(
  page: Page,
  request: APIRequestContext,
  prefix: string,
): Promise<string> {
  const email = `${prefix}-${Date.now()}@example.com`;

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Welcome to Resonance" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/verify/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Check your email to continue" })).toBeVisible();

  // Poll: the code is sent asynchronously, so it can land a moment after the redirect.
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

  await expect(page).toHaveURL(/\/interests/, { timeout: 20_000 });
  return email;
}

/**
 * Skip the interest step and land on whatever follows it.
 *
 * Pressing Continue with nothing selected **is** the skip: the design draws no skip control, and
 * an empty selection is a first-class outcome the contract accepts (`MemberInterestsSchema` takes
 * a minimum of zero). Specs that are not about interests use this to get through the door.
 */
export async function skipInterests(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: /Select \d+ topics/ })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(AFTER_INTERESTS, { timeout: 20_000 });
}
