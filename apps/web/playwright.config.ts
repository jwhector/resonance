import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config (ADR-0011). Boots the app and runs specs in apps/web/e2e.
 * CI installs Chromium and runs `pnpm test:e2e`.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
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
