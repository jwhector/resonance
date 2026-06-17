import type { NextConfig } from "next";

const config: NextConfig = {
  // Workspace packages ship TypeScript source (no build step); Next transpiles them.
  transpilePackages: [
    "@resonance/ui",
    "@resonance/core",
    "@resonance/ai",
    "@resonance/auth",
    "@resonance/commerce",
    "@resonance/community",
    "@resonance/db",
  ],
  typedRoutes: true,
  // Linting is a dedicated pipeline task (`pnpm lint` via our shared flat config) and
  // a CI gate; don't run a second, differently-configured pass inside `next build`.
  eslint: { ignoreDuringBuilds: true },
};

export default config;
