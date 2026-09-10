import { defineConfig, configDefaults } from "vitest/config";

/**
 * Vitest is for unit/component tests only. Playwright owns end-to-end specs — exclude the
 * `*.spec.ts` files under `e2e/` so Vitest doesn't try to run Playwright's `test` API (ADR-0011).
 * The exclusion is by FILENAME rather than by the whole `e2e/` directory: fixture helpers under
 * `e2e/lib/` can carry pure `*.test.ts` unit tests, which is where a property a Playwright spec
 * depends on but cannot cheaply assert belongs (see `e2e/lib/discovery-query.test.ts`).
 *
 * Component tests (the interview client wrapper) render into a real DOM with React
 * Testing Library, so tests run in `jsdom`; pure-logic tests (message mapping, action
 * validation) run in the same env without a DOM. `esbuild.jsx: "automatic"` lets test
 * files use JSX without a classic-runtime React import — mirrors `@resonance/ui`.
 */
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    exclude: [...configDefaults.exclude, "e2e/**/*.spec.ts", ".next/**"],
  },
});
