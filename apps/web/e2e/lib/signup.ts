import { type APIRequestContext, type Page, expect } from "@playwright/test";
import { isCreatorIntent, type OnboardingIntent } from "@resonance/core";
import { deleteUserByEmail } from "./db";

/**
 * The real passwordless front door, driven the way a member drives it — shared by every spec that
 * needs a signed-in account.
 *
 * It is one helper rather than a copy per spec because the front door has a *step* in it:
 * `/interests` sits between email verification and the rest of onboarding for every newly
 * verified account, so every one of those specs passes through it. Keeping the route names in one
 * place also makes changing where `/interests` continues a single edit rather than one per spec.
 *
 * Sign-up dispatches **two** channels for the one address — a magic link and a 6-digit code — and
 * either completes the account. Both are driven here, from the same submitted form, so a spec
 * chooses a channel rather than reimplementing one. Each is read back through its own
 * `E2E_HARNESS`-gated seam (`/api/test/last-otp`, `/api/test/last-magic-link`), which reads the
 * same fake-mail singleton Better Auth sent through (ADR-0018 §4).
 */

/**
 * Where `/interests` continues, given the intent a spec signed up with.
 *
 * A creator intent goes on to the interview and anything else — including no intent at all —
 * goes to the member front door. Specs state their intent once, at sign-up, and ask this for the
 * destination rather than hard-coding one, so a spec cannot assert a landing its own sign-up
 * would not produce.
 *
 * A spec whose *subject* is the fork should assert the literal destinations instead: computing the
 * expectation from the same intent the app routed on would pass even if both were wrong together.
 */
export function afterInterests(intent?: OnboardingIntent): RegExp {
  return intent && isCreatorIntent(intent) ? /\/onboarding\/creator/ : /\/discover/;
}

/**
 * Every address these helpers have minted in this worker, recorded the moment it is generated
 * rather than when sign-up finishes.
 *
 * A timeout aborts a test at whatever await it is sitting on, and that is frequently one INSIDE
 * sign-up — after Better Auth has already created the account. A spec that learns the address from
 * the helper's RETURN VALUE never learns it at all in that case, and the row outlives the run:
 * that is how a leaked `e2e-discovery-member-…` account survived a timed-out follow test. Recording
 * at mint time closes the window, because the account cannot exist before the address does.
 *
 * Worker-scoped module state is safe here for the same reason the specs already rely on it: each
 * worker imports this module fresh, and tests within a worker run one at a time.
 */
const signedUp: string[] = [];

/**
 * Delete every account these helpers signed up, and forget them. Wire it directly as
 * `test.afterEach(deleteSignedUpAccounts)`.
 *
 * `afterEach` rather than a `finally` inside a test body: Playwright still runs hooks after a
 * timeout, and gives them their own budget, where a `finally` in the aborted body never runs.
 *
 * An address is forgotten only once its row is actually gone, and one failed delete does not stop
 * the others: a transient database error leaves the addresses it did not reach on the ledger for
 * the next test's hook to retry, rather than orphaning them where nothing can name them again. The
 * first failure is rethrown afterwards so the run still reports it.
 */
export async function deleteSignedUpAccounts(): Promise<void> {
  const failures: unknown[] = [];

  for (const email of [...signedUp]) {
    try {
      await deleteUserByEmail(email);
    } catch (error) {
      failures.push(error);
      continue;
    }
    signedUp.splice(signedUp.indexOf(email), 1);
  }

  if (failures.length > 0) throw failures[0];
}

/** Fill the 6 OTP cells one digit at a time (each cell is labelled "Digit N of 6"). */
export async function enterOtp(page: Page, otp: string): Promise<void> {
  for (let i = 0; i < otp.length; i++) {
    await page.getByLabel(`Digit ${i + 1} of 6`).fill(otp[i]!);
  }
}

/**
 * Submit the sign-up form for a fresh address and stop on `/verify`, where both sign-in emails are
 * now waiting.
 *
 * The generated address is unique per call because Better Auth allows one account per email, so
 * re-runs and parallel workers would otherwise collide. `prefix` should name the spec, and the
 * caller's run id keeps parallel workers off each other's accounts.
 */
async function requestSignInEmails(
  page: Page,
  prefix: string,
  intent?: OnboardingIntent,
): Promise<string> {
  const email = `${prefix}-${Date.now()}@example.com`;
  // Before the first navigation, not after the last: from here on the account may exist, and
  // teardown has to know about it even if this call never returns.
  signedUp.push(email);

  await page.goto(intent ? `/signup?intent=${intent}` : "/signup");
  await expect(page.getByRole("heading", { name: "Welcome to Resonance" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/verify/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Check your email to continue" })).toBeVisible();

  return email;
}

/**
 * Read one sign-in email back out of the harness, polling until it lands.
 *
 * Both emails are dispatched asynchronously, so either can arrive a moment after the redirect to
 * `/verify` — polling rather than a single read is what keeps that from being a race. `shape` is
 * asserted rather than merely awaited so a seam that answers with the wrong thing fails here,
 * naming the seam, instead of somewhere downstream that cannot say why.
 */
async function readSentEmail(
  request: APIRequestContext,
  seam: string,
  email: string,
  field: "otp" | "url",
  shape: RegExp,
): Promise<string> {
  let value = "";
  await expect
    .poll(
      async () => {
        const res = await request.get(`/api/test/${seam}?email=${encodeURIComponent(email)}`);
        if (!res.ok()) return null;
        const body = (await res.json()) as Record<string, string | null>;
        value = body[field] ?? "";
        return body[field];
      },
      { timeout: 15_000 },
    )
    .toMatch(shape);
  return value;
}

/**
 * Sign a brand-new account up and verify its email **by typing the 6-digit code**, stopping on
 * `/interests` — the step every newly verified account lands on. The caller decides what to do
 * there: pick topics, or skip with {@link skipInterests}.
 *
 * `intent` is what the person answered on `/start`, entering sign-up the way that screen sends
 * them. Omit it for a member: `/start` sends `explore` straight to `/discover`, so a member
 * genuinely arrives at sign-up with nothing stated.
 *
 * Returns the generated email so the caller can name the account it just made — to read a column
 * back, or seed a fixture against it. Deleting it is not the caller's job: the address is already
 * on the ledger {@link deleteSignedUpAccounts} drains.
 */
export async function signUpAndVerify(
  page: Page,
  request: APIRequestContext,
  prefix: string,
  intent?: OnboardingIntent,
): Promise<string> {
  const email = await requestSignInEmails(page, prefix, intent);
  const otp = await readSentEmail(request, "last-otp", email, "otp", /^\d{6}$/);

  await enterOtp(page, otp);
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/interests/, { timeout: 20_000 });
  return email;
}

/**
 * The same sign-up, verified **by opening the magic link** instead of typing the code.
 *
 * The two channels reach `/interests` by genuinely different routes, and that is the point of
 * having both here: the code is typed on a screen whose own URL carries the intent, while the link
 * carries a `callbackURL` Better Auth has been holding since sign-up. Thread one and not the other
 * and where someone lands depends on which email they happened to open — a split no assertion on a
 * single channel can see.
 *
 * Opening the link is a plain navigation, which is exactly what clicking it in a mail client does.
 */
export async function signUpAndVerifyByMagicLink(
  page: Page,
  request: APIRequestContext,
  prefix: string,
  intent?: OnboardingIntent,
): Promise<string> {
  const email = await requestSignInEmails(page, prefix, intent);
  const url = await readSentEmail(
    request,
    "last-magic-link",
    email,
    "url",
    /\/api\/auth\/magic-link\/verify\?/,
  );

  await page.goto(url);

  await expect(page).toHaveURL(/\/interests/, { timeout: 20_000 });
  return email;
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
