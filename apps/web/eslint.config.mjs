import next from "@resonance/eslint-config/next";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...next,
  { ignores: [".next/**", "next-env.d.ts"] },
  {
    // Node dev scripts (design-manifest capture tooling) run outside the Next bundle,
    // so they use Node globals rather than the browser/RSC environment.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
      },
    },
  },
];
