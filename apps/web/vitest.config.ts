import { defineConfig, configDefaults } from "vitest/config";

/**
 * Vitest is for unit/component tests only. Playwright owns end-to-end specs under
 * `e2e/` — exclude them so Vitest doesn't try to run Playwright's `test` API (ADR-0011).
 */
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "e2e/**", ".next/**"],
  },
});
