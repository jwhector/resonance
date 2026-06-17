import globals from "globals";
import react from "./react.js";

/**
 * Next.js app config. We intentionally keep the eslint-plugin-next rules out of
 * the shared tooling package to avoid a heavy dependency in every workspace;
 * the web app extends this and can add `eslint-config-next` locally if desired.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default [
  ...react,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
];
