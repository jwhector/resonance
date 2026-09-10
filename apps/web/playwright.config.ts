import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config (ADR-0011). Boots the app and runs specs in apps/web/e2e.
 * CI installs Chromium and runs `pnpm test:e2e`.
 */

/**
 * One id for this `playwright test` invocation, the same string in every worker it forks —
 * workers inherit the runner's environment, and this file is evaluated before the first one
 * starts.
 *
 * An id a spec builds at module scope identifies the WORKER, not the run: each worker re-imports
 * every spec it runs. A spec that seeds per-worker fixtures then has no way to tell rows a sibling
 * worker is legitimately using right now from rows an earlier run failed to clean up, and reports
 * the former as the latter.
 */
process.env.E2E_RUN_ID ??= `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export default defineConfig({
  testDir: "./e2e",
  // Playwright's default pattern also collects `*.test.ts`, which is Vitest's extension here
  // (docs/conventions.md § Testing) — and `e2e/lib` holds unit tests for the fixture helpers.
  // Loading one of those in a Playwright worker calls Vitest's `describe` outside a Vitest worker,
  // which throws and takes the whole E2E run with it.
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // Every spec that drives the passwordless front door signs up a real account, and whichever
  // test reaches a route first also pays for `next dev` compiling it. Measured against the real
  // Neon DB: ~23s for the first test, ~3s for the same test warm, ~33s each when five workers hit
  // a cold server at once. The 30s default sits inside that spread, so the suite passed or failed
  // on how warm the server happened to be — and `retries` hid it by running attempt two warm,
  // which makes a green run evidence that the retry passed rather than that the flow works. The
  // budget belongs here rather than in any one spec: the cost comes from `next dev` being the
  // server, not from what a spec asserts.
  timeout: 90_000,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Boot the app under the isolated E2E harness (ADR-0018 §4): the onboarding composition roots
    // (interview route, Server Actions, auth mount) select deterministic fakes for model / embedder
    // / mail. `E2E_HARNESS` is hard-guarded against production in `lib/e2e-harness.ts`. The fixed
    // `BETTER_AUTH_SECRET` unblocks Better Auth in `next dev` (NODE_ENV=development) — an E2E-only
    // throwaway, never a real secret. `DATABASE_URL` is inherited from the environment (the E2E
    // runs against the real Neon DB, so state actually persists).
    env: {
      E2E_HARNESS: "1",
      BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "e2e-harness-insecure-secret",
    },
  },
});
