import { type APIRequestContext, type Page, expect, test } from "@playwright/test";
import {
  deleteUserByEmail,
  seedDiscoveryFixture,
  type DiscoveryFixture,
} from "./lib/discovery-fixtures";

/**
 * End-to-end member discovery (Slice A, `pl-bbca` step 6 / `resonance-3f15`): the real front
 * door — `/start` → "exploring/buying" → `/discover` → search → embedding-ranked creators →
 * open a creator → their profile with offerings — plus the follow/unfollow path, the signed-out
 * prompt, draft exclusion, and the distinct empty surfaces.
 *
 * Runs under the isolated E2E harness (`E2E_HARNESS=1`, set by `playwright.config.ts`, ADR-0018
 * §4) against the real Neon DB, so the ranked query, the follow writes and the profile read are
 * all the live code paths. Only the model / mail / embedder are fakes, and the embedder being a
 * deterministic text hash is precisely what makes the ranking assertable — see
 * `./lib/discovery-fixtures.ts`.
 *
 * **Settled state only** (named plan risk; ADR-0011). Every assertion is a role query plus
 * `toBeVisible` / `toHaveURL` / `toHaveText` with a generous timeout. Nothing here asserts on an
 * intermediate token, a spinner, or a transient in-flight class.
 *
 * The fixtures are seeded once per worker process (`beforeAll` runs per worker) with a run id
 * unique to that worker, and removed in `afterAll`.
 */

/** Unique per worker process — each Playwright worker imports this module fresh. */
const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

let fixture: DiscoveryFixture;

test.beforeAll(async () => {
  fixture = await seedDiscoveryFixture(RUN_ID);
});

test.afterAll(async () => {
  await fixture?.cleanup();
});

/** Fill the 6 OTP cells one digit at a time (each cell is labelled "Digit N of 6"). */
async function enterOtp(page: Page, otp: string) {
  for (let i = 0; i < otp.length; i++) {
    await page.getByLabel(`Digit ${i + 1} of 6`).fill(otp[i]!);
  }
}

/**
 * Sign a brand-new member in through the real passwordless front door, exactly as
 * `onboarding-creator.spec.ts` does. Returns the email so the test can delete the user after.
 */
async function signInFreshMember(page: Page, request: APIRequestContext): Promise<string> {
  const email = `e2e-discovery-member-${RUN_ID}-${Date.now()}@example.com`;

  // Warm the harness's mail singleton with ONE auth request before the signup form fires two in
  // parallel. `harnessMailOverride()` builds its fake and calls `observeLoginCodes(fake)` in two
  // awaited steps with no lock, so two concurrent cold requests each build a fake: one wins the
  // `globalThis` slot the auth instance uses, the other wins the OTP observation slot — and
  // `peekLoginCode` then reads an array nothing writes to, so `/api/test/last-otp` answers `null`
  // forever. This one warm request removes the concurrency and is enough. It is a TEST-SIDE
  // mitigation, not a fix: the race lives in `apps/web/lib/e2e-harness.ts` and is why
  // `onboarding-creator.spec.ts` fails on `main` today. Filed as `resonance-86dd`.
  await request.get("/api/auth/get-session");

  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Welcome to Resonance" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/verify/, { timeout: 15_000 });

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
  // Verification lands on the creator interview; the member front door is a nav away.
  await expect(page).toHaveURL(/\/onboarding\/creator/, { timeout: 20_000 });

  return email;
}

/** Run a search from the field itself — never by hand-writing the `?q=` URL. */
async function searchFor(page: Page, query: string) {
  const field = page.getByRole("searchbox");
  await field.fill(query);
  await field.press("Enter");
  await expect(page.getByRole("list", { name: "Creator results" })).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * The display names of the ranked rows, in the order the ranker returned them. Each row renders
 * exactly one link — the creator's name — so link order is row order.
 */
async function rankedNames(page: Page): Promise<string[]> {
  const names = await page
    .getByRole("list", { name: "Creator results" })
    .getByRole("link")
    .allInnerTexts();
  return names.map((name) => name.trim());
}

test("a member reaches ranked creators through the front door and opens a profile", async ({
  page,
}) => {
  // 1) The real intent fork. `explore` is the slot that pointed at the scaffold home until
  //    this slice cashed it in — driving it here is what proves the screen is reachable.
  await page.goto("/start");
  await page.getByRole("radio", { name: "I'm exploring/ buying" }).click();
  // `exact` — `next dev` injects its own "Open Next.js Dev Tools" button into every page.
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(page).toHaveURL(/\/discover$/, { timeout: 20_000 });

  // 2) Search from the field. The settled outcome is the ranked list, not a token.
  await searchFor(page, fixture.query);

  const names = await rankedNames(page);
  expect(names).toContain(fixture.top.displayName);
  expect(names).toContain(fixture.second.displayName);
  // Ranked, not merely returned: the exact-text match outranks the near match. Relative order
  // only — unrelated rows in the dev DB may legitimately sit between them.
  expect(names.indexOf(fixture.top.displayName)).toBeLessThan(
    names.indexOf(fixture.second.displayName),
  );

  // 3) Open the creator from the result row and land on the full profile.
  await page.getByRole("link", { name: fixture.top.displayName }).click();
  await expect(page).toHaveURL(/\/creator\/[0-9a-f-]{36}/, { timeout: 20_000 });
  await expect(page.getByRole("heading", { name: fixture.top.displayName })).toBeVisible();
  await expect(page.getByText(fixture.top.headline)).toBeVisible();

  // 4) …including offerings, which `/creator/[id]` only started rendering for this slice.
  await expect(page.getByRole("heading", { name: "Offerings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: fixture.offering.title })).toBeVisible();
  await expect(page.getByText(fixture.offering.description)).toBeVisible();
});

test("draft-status profiles never appear in results", async ({ page }) => {
  // The draft is embedded from the SAME text as the top row, so it would rank first if the
  // `status = 'ready'` filter regressed. Its absence is therefore a real signal.
  await page.goto("/discover");
  await searchFor(page, fixture.query);

  await expect(page.getByRole("link", { name: fixture.top.displayName })).toBeVisible();
  await expect(page.getByText(fixture.draft.displayName)).toHaveCount(0);
});

test("a signed-in member follows a creator and the state survives a reload", async ({
  page,
  request,
}) => {
  const email = await signInFreshMember(page, request);
  try {
    await page.goto("/discover");
    await searchFor(page, fixture.query);

    const follow = page.getByRole("button", { name: `Follow ${fixture.top.displayName}` });
    await expect(follow).toBeVisible();
    await follow.click();

    // Settled outcome of the mutation: the row's control is now the Following affordance.
    const following = page.getByRole("button", { name: `Unfollow ${fixture.top.displayName}` });
    await expect(following).toBeVisible({ timeout: 20_000 });
    await expect(following).toHaveText("Following");

    // Acceptance criterion 3: PERSISTS. A reload re-runs the ranked query server-side, so the
    // state can only still be "Following" if the follow edge actually landed in the database.
    await page.reload();
    await expect(
      page.getByRole("button", { name: `Unfollow ${fixture.top.displayName}` }),
    ).toBeVisible({ timeout: 20_000 });

    // And back again — unfollow is the same claim in the other direction.
    await page.getByRole("button", { name: `Unfollow ${fixture.top.displayName}` }).click();
    await expect(
      page.getByRole("button", { name: `Follow ${fixture.top.displayName}` }),
    ).toHaveText("Follow", { timeout: 20_000 });

    await page.reload();
    await expect(
      page.getByRole("button", { name: `Follow ${fixture.top.displayName}` }),
    ).toHaveText("Follow", { timeout: 20_000 });
  } finally {
    await deleteUserByEmail(email);
  }
});

test("a signed-out member is prompted to sign in rather than silently failing", async ({
  page,
}) => {
  // A fresh Playwright context carries no session cookie.
  await page.goto("/discover");
  await searchFor(page, fixture.query);

  const follow = page.getByRole("button", { name: `Follow ${fixture.top.displayName}` });
  await follow.click();

  // Scoped past Next's own always-present `role="alert"` route announcer — the assertion is
  // still that the sign-in prompt IS an alert, not merely that some element appeared.
  const prompt = page.locator('[role="alert"][data-follow-notice="sign-in"]');
  await expect(prompt).toBeVisible({ timeout: 10_000 });
  await expect(prompt).toContainText(/sign in to follow creators/i);
  await expect(prompt.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signup");

  // The row was NOT mutated: still the default affordance, still an unresolved follow state.
  await expect(follow).toHaveText("Follow");
  await expect(follow).toHaveAttribute("data-follow-state", "unknown");
  // …and a reload proves nothing was written behind the prompt.
  await page.reload();
  await expect(
    page.getByRole("button", { name: `Follow ${fixture.top.displayName}` }),
  ).toHaveAttribute("data-follow-state", "unknown");
});

test("the dataless tabs, the idle surface and a real result page stay distinct", async ({
  page,
}) => {
  // (a) Nothing searched yet — the idle prompt, and neither of the two "nothing found" states.
  await page.goto("/discover");
  await expect(page.locator('[data-empty-state="idle"]')).toBeVisible();
  await expect(page.locator('[data-empty-state="coming-soon"]')).toHaveCount(0);
  await expect(page.locator('[data-empty-state="no-results"]')).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Creator results" })).toHaveCount(0);

  // (b) A dataless tab — a product statement, not a search outcome. Asserted on all three,
  //     because the copy is per-tab and "coming soon" must never be mistaken for "found nothing".
  for (const [tab, heading] of [
    ["Products", "Product search is coming soon"],
    ["Services", "Service search is coming soon"],
    ["Posts", "Post search is coming soon"],
  ] as const) {
    await page.getByRole("tab", { name: tab }).click();
    await expect(page).toHaveURL(new RegExp(`tab=${tab.toLowerCase()}`), { timeout: 20_000 });
    const comingSoon = page.locator('[data-empty-state="coming-soon"]');
    await expect(comingSoon).toBeVisible({ timeout: 20_000 });
    await expect(comingSoon.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.locator('[data-empty-state="no-results"]')).toHaveCount(0);
    await expect(page.locator('[data-empty-state="idle"]')).toHaveCount(0);
  }

  // (c) A real Creators search — rows, and neither empty surface.
  await page.getByRole("tab", { name: "Creators" }).click();
  await expect(page).toHaveURL(/\/discover$/, { timeout: 20_000 });
  await searchFor(page, fixture.query);
  await expect(page.locator('[data-empty-state="idle"]')).toHaveCount(0);
  await expect(page.locator('[data-empty-state="coming-soon"]')).toHaveCount(0);
  await expect(page.locator('[data-empty-state="no-results"]')).toHaveCount(0);

  // NOTE — the fourth surface, `NoResultsState`, is deliberately NOT asserted here: with no
  // default similarity floor on the query, a Creators search against a populated database always
  // returns rows, so the zero-result page is unreachable through the UI. It is covered at the
  // component level by `app/(app)/discover/discover-client.test.tsx`, which asserts it against
  // both the coming-soon and idle surfaces. Recorded in
  // `design/manifest/screens/12-search-creators/parity.md`.
});
