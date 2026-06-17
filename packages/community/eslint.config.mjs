import base from "@resonance/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [...base, { ignores: ["dist/**"] }];
