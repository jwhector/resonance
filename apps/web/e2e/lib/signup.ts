import { type APIRequestContext, type Page, expect } from "@playwright/test";
import { isCreatorIntent, type OnboardingIntent } from "@resonance/core";

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
 * The two emails sign-up sends, either of which verifies the account.
 *
 * They are a real fork in the product, not a test detail: the code is typed on `/verify`, while
 * the link comes back through the `callbackURL` Better Auth was handed at sign-up. Anything that
 * has to survive verification has to survive both, so specs name the one they drive.
 */
export type VerifyChannel = "code" | "link";

/**
 * Where `/interests` continues, given the intent a spec signed up with.
 *
 * A creator intent goes on to the interview and anything else — including no intent at all —
 * goes to the member front door. Specs state their intent once, at sign-up, and ask this for the
 * destination rather than hard-coding one, so a spec cannot assert a landing its own sign-up
 * would not produce.
 */
export function afterInterests(intent?: OnboardingIntent): RegExp {
  return intent && isCreatorIntent(intent) ? /\/onboarding\/creator/ : /\/discover/;
}

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
 * `intent` is what the person answered on `/start`, entering sign-up the way that screen sends
 * them. Omit it for a member: `/start` sends `explore` straight to `/discover`, so a member
 * genuinely arrives at sign-up with nothing stated.
 *
 * `channel` picks which of the two emails is used to verify. Sign-up always sends both, so this
 * chooses between them rather than changing what happens — and the two must be interchangeable.
 * Defaults to the code, which needs no inbox reading.
 *
 * Returns the generated email so the caller can delete the account afterwards
 * (`deleteUserByEmail`). `prefix` should name the spec, and the caller's run id keeps parallel
 * workers off each other's accounts — Better Auth allows one account per email.
 */
export async function signUpAndVerify(
  page: Page,
  request: APIRequestContext,
  prefix: string,
  { intent, channel = "code" }: { intent?: OnboardingIntent; channel?: VerifyChannel } = {},
): Promise<string> {
  const email = `${prefix}-${Date.now()}@example.com`;

  await page.goto(intent ? `/signup?intent=${intent}` : "/signup");
  await expect(page.getByRole("heading", { name: "Welcome to Resonance" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/verify/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Check your email to continue" })).toBeVisible();

  if (channel === "code") await verifyByCode(page, request, email);
  else await verifyByLink(page, request, email);

  await expect(page).toHaveURL(/\/interests/, { timeout: 20_000 });
  return email;
}

/** Type the 6-digit code off the test seam, the way someone with the email open does. */
async function verifyByCode(page: Page, request: APIRequestContext, email: string): Promise<void> {
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
}

/**
 * Open the magic link itself, leaving `/verify` behind without touching the code.
 *
 * The URL comes from the harness read-back rather than the page, because a real magic link only
 * ever exists in an inbox. Following it exercises Better Auth's own verify endpoint and the
 * `callbackURL` it was given at sign-up — which is the whole point: that callback is the only
 * thing carrying a stated intent on this channel.
 */
async function verifyByLink(page: Page, request: APIRequestContext, email: string): Promise<void> {
  let url = "";
  await expect
    .poll(
      async () => {
        const res = await request.get(
          `/api/test/last-magic-link?email=${encodeURIComponent(email)}`,
        );
        if (!res.ok()) return null;
        const body = (await res.json()) as { url: string | null };
        url = body.url ?? "";
        return body.url;
      },
      { timeout: 15_000 },
    )
    .toContain("/magic-link/verify");

  await page.goto(url);
}

/**
 * Skip the interest step and land on whatever follows it.
 *
 * Pressing Continue with nothing selected **is** the skip: the design draws no skip control, and
 * an empty selection is a first-class outcome the contract accepts (`MemberInterestsSchema` takes
 * a minimum of zero). Specs that are not about interests use this to get through the door.
 *
 * Pass the same `intent` the account signed up with, since that is what decides where this step
 * lets out.
 */
export async function skipInterests(page: Page, intent?: OnboardingIntent): Promise<void> {
  await expect(page.getByRole("heading", { name: /Select \d+ topics/ })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(afterInterests(intent), { timeout: 20_000 });
}
