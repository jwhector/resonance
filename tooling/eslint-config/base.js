import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

/**
 * Shared base ESLint flat config for all Resonance packages.
 * Keep this lean and high-signal — rules here run on every package, so a noisy
 * rule becomes noise everywhere. See docs/conventions.md for the rationale.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export default tseslint.config(
  { ignores: ["dist/**", ".next/**", ".turbo/**", "node_modules/**", "coverage/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      // Domain packages must not reach into other packages' internals — import
      // via the public package entrypoint only (boundary hygiene, see ADR-0003).
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@resonance/*/src/*", "@resonance/*/dist/*"],
              message:
                "Import from a package's public entrypoint (@resonance/x), not its internals.",
            },
          ],
        },
      ],
    },
  },
  prettier,
);
