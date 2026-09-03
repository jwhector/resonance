import { type Page, expect, test } from "@playwright/test";
import { readOnboardingIntent } from "./lib/db";
import { deleteSignedUpAccounts, signUpAndVerify, signUpAndVerifyByMagicLink } from "./lib/signup";

/**
 * End-to-end onboarding intent: what someone answers on `/start` decides where onboarding lets
 * them out, and outlives the request that carried it.
 *
 * The answer makes a round trip through email before anything can act on it, and it makes that
 * trip in the URL — so the thing most likely to break is not the fork but the **carry**. Sign-up
 * dispatches two channels for one address: the magic link comes back through a `callbackURL`
 * Better Auth has been holding, the code is typed on a screen with its own URL. Those are two
 * separate pieces of threading, and if only one is right then where somebody lands depends on
 * which email they happened to open. So the creator path is proven **once per channel** rather
 * than once — a single assertion would pass with half the flow broken.
 *
 * Every test also reads the column back, because the destination alone cannot show that the answer
 * was *stored*. Routing is the first thing to need this value, not the last: the conversion screen
 * and the analytics behind it read the column long after the URL is gone.
 *
 * Runs under the isolated E2E harness (`E2E_HARNESS=1`, set by `playwright.config.ts`, ADR-0018
 * §4) against the real Neon DB, so the write and the read are live code paths — only the mail is a
 * fake, and only so the two sign-in emails can be read back without a mailbox.
 *
 * **Settled state only** (ADR-0011): `toHaveURL` and role queries with generous timeouts, never an
 * assertion on an in-flight submit. The destinations are written out literally rather than derived
 * from the intent through `afterInterests`, because the fork is this spec's subject: an expectation
 * computed the same way the app computes it would agree with the app even when both are wrong.
 */

/** Unique per worker process — each Playwright worker imports this module fresh. */
const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * The sign-up helper records each address it mints, and this drains that record.
 *
 * Cleanup lives in `afterEach` rather than at the end of a test body because a timeout aborts the
 * body at its current `await` — so cleanup written there is exactly the cleanup that never runs on
 * the days it matters.
 */
test.afterEach(deleteSignedUpAccounts);

/**
 * Press Continue on the interest step with nothing selected.
 *
 * That is the skip, and it is also the submission that forks: the same action stores the intent and
 * chooses the destination, so an empty selection still exercises everything this spec is about.
 */
async function continuePastInterests(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { name: /Select \d+ topics/ })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
}

test("a creator intent survives the code channel and lands on the interview", async ({
  page,
  request,
}) => {
  const email = await signUpAndVerify(page, request, `e2e-intent-otp-${RUN_ID}`, "share");

  await continuePastInterests(page);

  await expect(page).toHaveURL(/\/onboarding\/creator/, { timeout: 20_000 });
  expect(await readOnboardingIntent(email)).toBe("share");
});

test("a creator intent survives the magic-link channel and lands on the interview", async ({
  page,
  request,
}) => {
  const email = await signUpAndVerifyByMagicLink(
    page,
    request,
    `e2e-intent-link-${RUN_ID}`,
    "share",
  );

  await continuePastInterests(page);

  // The pair with the test above is the assertion: same answer, same destination, different email
  // opened. A `callbackURL` that lost the intent lands here on /discover and only here.
  await expect(page).toHaveURL(/\/onboarding\/creator/, { timeout: 20_000 });
  expect(await readOnboardingIntent(email)).toBe("share");
});

test("a member who opens the magic link reaches the front door", async ({ page, request }) => {
  const email = await signUpAndVerifyByMagicLink(page, request, `e2e-intent-member-${RUN_ID}`);

  await continuePastInterests(page);

  await expect(page).toHaveURL(/\/discover/, { timeout: 20_000 });
  // Nothing was stated, so nothing is stored: null means "never answered", which is a different
  // fact from "answered explore" and has to stay distinguishable from it.
  expect(await readOnboardingIntent(email)).toBeNull();
});

test("business is stored as itself rather than collapsed into share", async ({ page, request }) => {
  const email = await signUpAndVerify(page, request, `e2e-intent-business-${RUN_ID}`, "business");

  await continuePastInterests(page);

  // Both creator intents route the same way, which is exactly why the column has to be read: a
  // build that collapsed them into one "creator" value would route identically and pass every
  // assertion above. The distinction is most of why this was made data.
  await expect(page).toHaveURL(/\/onboarding\/creator/, { timeout: 20_000 });
  expect(await readOnboardingIntent(email)).toBe("business");
});

test("a forged intent degrades to the front door and writes nothing", async ({ page, request }) => {
  const email = await signUpAndVerify(page, request, `e2e-intent-forged-${RUN_ID}`);

  // The value rides a URL anyone can type. The worst it can do is choose an onboarding path
  // `/start` hands out for free — so an unrecognized one must read as no answer at all, and must
  // not throw at somebody who has just verified their email.
  await page.goto("/interests?intent=not-a-real-intent");
  await continuePastInterests(page);

  await expect(page).toHaveURL(/\/discover/, { timeout: 20_000 });
  expect(await readOnboardingIntent(email)).toBeNull();
});
