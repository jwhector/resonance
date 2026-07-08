import { defineConfig } from "vitest/config";

/**
 * @resonance/ui unit/component tests (ADR-0011). Components are rendered into a real
 * DOM with React Testing Library, so tests run in the `jsdom` environment; pure-logic
 * helpers (e.g. `lib/otp`) run in the same env without a DOM. `setupFiles` registers
 * the jest-dom matchers and auto-cleanup. `esbuild.jsx: "automatic"` lets test files
 * use JSX without a classic-runtime React import.
 */
export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
