// Shared harness auth for the design-manifest capture scripts (ADR-0019).
// Drives real passwordless sign-in through the E2E fake harness (E2E_HARNESS=1), reusing the
// exact roles/labels the Playwright E2E asserts on (apps/web/e2e/onboarding-creator.spec.ts)
// and the fake-mail OTP that the dev server prints to its log.
import { readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

// The `next dev` /api/test/last-otp read-back seam is unreliable (the route handler and the
// auth mount get separate @resonance/auth/testing module instances, so the peek registry the
// route reads isn't the one the mount's fake registered into). So we read the OTP straight from
// the server log where the fake mail prints it. Point SERVER_LOG at the dev server's log file.
export async function readLoginCode({ serverLog, email, tries = 50, intervalMs = 500 }) {
  const esc = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`login code for ${esc}: (\\d{6})`);
  for (let i = 0; i < tries; i++) {
    try {
      const m = (await readFile(serverLog, "utf8")).match(re);
      if (m) return m[1];
    } catch {
      /* log file not flushed / not present yet */
    }
    await sleep(intervalMs);
  }
  throw new Error(`no OTP found in server log (${serverLog}) for ${email}`);
}

/**
 * Sign in through the harness to an authenticated session. `onScreen(name, page)` (optional)
 * fires at the public "signup" and "verify" screens so a caller can capture them. Resolves once
 * authenticated (navigated off /verify).
 */
export async function authenticate(page, { baseUrl, serverLog, email, onScreen }) {
  await page.goto(`${baseUrl}/signup`, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Welcome to Resonance" }).waitFor({ timeout: 30_000 });
  await onScreen?.("signup", page);

  await page.getByLabel("Email").fill(email);
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForURL(/\/verify/, { timeout: 20_000 });
  await page
    .getByRole("heading", { name: "Check your email to continue" })
    .waitFor({ timeout: 20_000 });
  await onScreen?.("verify", page);

  const otp = await readLoginCode({ serverLog, email });
  for (let i = 0; i < 6; i++) await page.getByLabel(`Digit ${i + 1} of 6`).fill(otp[i]);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL((url) => !/\/verify/.test(url.pathname ?? url), { timeout: 30_000 });
  return { email, otp };
}
