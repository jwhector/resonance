import { type Page, expect, test } from "@playwright/test";
import { deleteUserByEmail } from "./lib/db";
import {
  INTEREST_FIXTURE_PREFIX,
  seedInterestFixture,
  type InterestFixture,
} from "./lib/interest-fixtures";
import { afterInterests, signUpAndVerify, skipInterests } from "./lib/signup";

/**
 * End-to-end member interests: a new member picks
 * topics on the way in and lands on a `/discover` that has something to suggest — and the member
 * who skips still gets today's idle surface, unchanged.
 *
 * Both paths must be proven, and they are asserted as a **contrast on the
 * same URL**: `/discover` with an empty query renders interest-ranked creators for the member who
 * picked, and the idle prompt for the member who did not. Either assertion alone would pass
 * against a broken build — "rows appeared" is also true of an unranked dump, and "idle appeared"
 * is also true of personalization that never ran.
 *
 * Runs under the isolated E2E harness (`E2E_HARNESS=1`, set by `playwright.config.ts`, ADR-0018
 * §4) against the real Neon DB, so the interest write, the embedding and the ranked read are all
 * live code paths. Only the model / mail / embedder are fakes — and the embedder being a
 * deterministic text hash is exactly what lets the ranking be asserted rather than hoped for (see
 * `./lib/interest-fixtures.ts`).
 *
 * **Settled state only** (ADR-0011): role queries plus `toBeVisible` / `toHaveURL` / `toBeChecked`
 * with generous timeouts. Nothing asserts on an in-flight submit or a transient class.
 */

/** Unique per worker process — each Playwright worker imports this module fresh. */
const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * What the current test has to clean up. Torn down in `afterEach` rather than a `finally` inside
 * the test body, because a Playwright **timeout** aborts the body at its current `await` and the
 * `finally` never runs — which is precisely how leaked fixtures accumulate. `afterEach` is still run after a timeout, and gets its own time budget.
 *
 * Worker-scoped module state is safe here: each worker imports this module fresh, and tests within
 * a worker run one at a time.
 */
let fixture: InterestFixture | undefined;
let accounts: string[] = [];

test.afterEach(async () => {
  for (const email of accounts) await deleteUserByEmail(email);
  accounts = [];
  await fixture?.cleanup();
  fixture = undefined;
});

/**
 * Select a topic chip the way a member does.
 *
 * The chips are visually-hidden checkboxes *inside* their `<label>`, so
 * `getByRole("checkbox").check()` fails with "label intercepts pointer events" — the label is
 * what receives the click. That is not a product bug (a real click lands on the label and toggles
 * the input); it is purely how the control has to be driven. Scoped to the fieldset so a topic
 * label can never be confused with copy elsewhere on the page.
 */
async function pickTopic(page: Page, label: string) {
  await page.getByRole("group").getByText(label, { exact: true }).click();
  await expect(page.getByRole("checkbox", { name: label })).toBeChecked();
}

/** The display names of the ranked rows, in the order the ranker returned them. */
async function rankedNames(page: Page): Promise<string[]> {
  const names = await page
    .getByRole("list", { name: "Creator results" })
    .getByRole("link")
    .allInnerTexts();
  return names.map((name) => name.trim());
}

/**
 * Fail loudly, and with the cause named, if a previous run's interest fixture is still in the
 * database.
 *
 * The fixture's content is dictated by the taxonomy and so cannot be run-scoped: a leaked sibling
 * scores the same 1.0 and can win rank 1 on the id tiebreak. Without this check that surfaces as
 * `expect(names[0]).toBe(...)` — indistinguishable from a real ranking regression, which is
 * precisely the diagnosis that cost a day last time.
 */
function assertNoLeakedSiblings(names: readonly string[], ownDisplayName: string) {
  const strays = names.filter(
    (name) => name.startsWith(INTEREST_FIXTURE_PREFIX) && name !== ownDisplayName,
  );
  expect(
    strays,
    `Leaked interest fixtures from earlier runs are competing for rank 1. ` +
      `Remove the stale "${INTEREST_FIXTURE_PREFIX} …" creators before trusting this result.`,
  ).toEqual([]);
}

test("a member picks topics and lands on an interest-ranked /discover", async ({
  page,
  request,
}) => {
  const seeded = (fixture = await seedInterestFixture(RUN_ID));

  // 1) The real front door, stopping on the interest-selection step.
  accounts.push(await signUpAndVerify(page, request, `e2e-interests-${RUN_ID}`));
  await expect(page.getByRole("heading", { name: /Select \d+ topics/ })).toBeVisible();

  // 2) Pick the topics the fixture creator was embedded from.
  for (const topic of seeded.topics) {
    await pickTopic(page, topic.label);
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(afterInterests(), { timeout: 20_000 });

  // 3) The selection PERSISTED. Re-entering the step re-reads it from the
  //    database and rehydrates the picker — the chips can only be checked if the write landed, not
  //    merely if the client remembered.
  await page.goto("/interests");
  for (const topic of seeded.topics) {
    await expect(page.getByRole("checkbox", { name: topic.label })).toBeChecked();
  }

  // 4) An EMPTY query now ranks creators by the
  //    member's stored interest vector (`DiscoveryPort` invariant 8). The search box is empty and
  //    the URL carries no `?q=`, so these rows cannot have come from a search.
  await page.goto("/discover");
  await expect(page.getByRole("list", { name: "Creator results" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page).toHaveURL(/\/discover$/);
  await expect(page.locator('[data-empty-state="idle"]')).toHaveCount(0);

  // 5) Ranked BY THE INTEREST VECTOR, not merely returned. The fixture creator's embedded text is
  //    byte-identical to the member's interest text, so it scores 1.0 — the maximum — and must
  //    therefore be first. A regression that returned rows in any other order fails here.
  const names = await rankedNames(page);
  assertNoLeakedSiblings(names, seeded.match.displayName);
  expect(names[0]).toBe(seeded.match.displayName);

  // 6) A blank search is still not a personalized browse. `?q=%20%20`
  //    trims to empty and fails validation at the boundary, so it renders the idle surface rather
  //    than quietly falling back to this member's interests.
  await page.goto("/discover?q=%20%20");
  await expect(page.locator('[data-empty-state="idle"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("list", { name: "Creator results" })).toHaveCount(0);
});

test("a member who skips the picker still gets today's idle surface", async ({ page, request }) => {
  accounts.push(await signUpAndVerify(page, request, `e2e-interests-skip-${RUN_ID}`));

  // Skipping is pressing Continue with nothing selected — the design draws no skip control, and an
  // empty selection is a first-class outcome rather than an error.
  await skipInterests(page);

  // The signed-in member has no interest vector, so there is nothing to suggest. That must read as
  // `idle` — "nothing searched AND nothing to suggest" — and never as `no-results`, which would
  // blame the member for a query they never made.
  await page.goto("/discover");
  await expect(page.locator('[data-empty-state="idle"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-empty-state="no-results"]')).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Creator results" })).toHaveCount(0);

  // And the surface is still a working search — skipping personalization costs the member nothing
  // else.
  const field = page.getByRole("searchbox");
  await field.fill("stoneware");
  await field.press("Enter");
  await expect(page).toHaveURL(/\/discover\?q=stoneware/, { timeout: 20_000 });
  await expect(page.locator('[data-empty-state="idle"]')).toHaveCount(0);
});
