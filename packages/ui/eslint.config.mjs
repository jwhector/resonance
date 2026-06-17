import react from "@resonance/eslint-config/react";

/** @type {import("eslint").Linter.Config[]} */
export default [...react, { ignores: ["dist/**"] }];
