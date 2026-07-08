import { defineConfig, configDefaults } from "vitest/config";

/**
 * Vitest is for unit/component tests only. Playwright owns end-to-end specs under
 * `e2e/` — exclude them so Vitest doesn't try to run Playwright's `test` API (ADR-0011).
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
    exclude: [...configDefaults.exclude, "e2e/**", ".next/**"],
  },
});
