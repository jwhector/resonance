import next from "@resonance/eslint-config/next";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...next,
  { ignores: [".next/**", "next-env.d.ts"] },
];
