import { expect, test } from "@playwright/test";
import { deleteUserByEmail, readOnboardingIntent } from "./lib/db";
import { signUpAndVerify, skipInterests, type VerifyChannel } from "./lib/signup";

/**
 * End-to-end: what someone answers on `/start` survives sign-up and decides where they land.
 *
 * **Everything here is asserted per verification channel**, because sign-up sends two emails and
 * they carry the answer by different means — the magic link through the `callbackURL` Better Auth
 * stores against its token, the code through the URL of the screen it is typed on. Threading one
 * and not the other would leave the destination depending on which email someone happened to open,
 * and a single-channel test would pass throughout.
 *
 * Each case makes two separate claims: **where the browser ended up**, and **what was recorded**.
 * Routing reads the intent off the URL, so a build that routed correctly and stored nothing would
 * satisfy the first claim alone — which is precisely the half-implementation this feature exists to
 * avoid, since the column is what later screens and analytics read.
 *
 * Runs under the isolated E2E harness (`E2E_HARNESS=1`, ADR-0018 §4) against the real Neon DB, so
 * the intent write and the fork are live code paths; only the mail is faked, which is what makes
 * the link channel drivable at all.
 *
 * **Settled state only** (ADR-0011): `toHaveURL` / `toBeVisible` with generous timeouts.
 */

/** Unique per worker process — each Playwright worker imports this module fresh. */
const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * Accounts drained in `afterEach` rather than a `finally` inside the test body: Playwright aborts
 * the body at its current `await` on a timeout, so a `finally` there never runs and the member row
 * leaks into the shared dev database. Every case here signs up, so every case has one to remove.
 */
let accounts: string[] = [];

test.afterEach(async () => {
  for (const email of accounts) await deleteUserByEmail(email);
  accounts = [];
});

const CHANNELS: VerifyChannel[] = ["code", "link"];

for (const channel of CHANNELS) {
  test(`a creator intent verified by ${channel} reaches the interview and is stored`, async ({
    page,
    request,
  }) => {
    const email = await signUpAndVerify(page, request, `e2e-intent-share-${channel}-${RUN_ID}`, {
      intent: "share",
      channel,
    });
    accounts.push(email);

    // The answer survived THIS channel specifically — asserted before the fork runs, so a failure
    // here names the channel rather than blaming the routing that reads it.
    await expect(page).toHaveURL(/\/interests\?intent=share/, { timeout: 20_000 });

    // Pressing Continue with nothing selected is the skip; the helper asserts the step let out at
    // the destination this intent implies.
    await skipInterests(page, "share");

    expect(await readOnboardingIntent(email)).toBe("share");
  });

  test(`a member verified by ${channel} reaches discovery with nothing stored`, async ({
    page,
    request,
  }) => {
    // No intent stated: `/start` sends `explore` straight to `/discover` and never through
    // sign-up, so a member genuinely arrives here with nothing to carry.
    const email = await signUpAndVerify(page, request, `e2e-intent-member-${channel}-${RUN_ID}`);
    accounts.push(email);

    await expect(page).toHaveURL(/\/interests$/, { timeout: 20_000 });
    await skipInterests(page);

    // Null is the honest record of "never answered". A default would be indistinguishable from
    // someone actually choosing to explore.
    expect(await readOnboardingIntent(email)).toBeNull();
  });
}

test("the second creator intent is stored as itself, not collapsed into one creator value", async ({
  page,
  request,
}) => {
  // `share` and `business` both lead to the interview, so the destination cannot tell them apart —
  // only the column can, and the design forks on the difference.
  const email = await signUpAndVerify(page, request, `e2e-intent-business-${RUN_ID}`, {
    intent: "business",
  });
  accounts.push(email);

  await skipInterests(page, "business");

  expect(await readOnboardingIntent(email)).toBe("business");
});

test("a forged intent degrades to a member rather than failing sign-up", async ({ page }) => {
  // `creator` is the most plausible forgery — it is a real role value, just not an intent. The
  // channel is not varied here because the value is dropped at `/signup`, before either email is
  // sent: an unrecognized intent must never reach the magic link's `callbackURL`, which Better
  // Auth validates and would reject, taking the whole sign-up down with it.
  await page.goto("/signup?intent=creator");
  await expect(page.getByRole("heading", { name: "Welcome to Resonance" })).toBeVisible();

  const email = `e2e-intent-forged-${RUN_ID}-${Date.now()}@example.com`;
  await page.getByLabel("Email").fill(email);
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Sign-up still works, and the forged value is already gone from the flow.
  await expect(page).toHaveURL(/\/verify\?email=[^&]+$/, { timeout: 15_000 });
  accounts.push(email);

  await expect(page.getByRole("heading", { name: "Check your email to continue" })).toBeVisible();
});
