---
name: scaffold-domain-package
description: Use when adding a new package to the Resonance monorepo — a domain package (e.g. messaging, reviews) or a platform package. Creates the package with the standard layout, boundaries, tsconfig, and its own CLAUDE.md so it matches every other package (ADR-0003).
---

# Recipe: Scaffold a domain package

Every package looks the same so agents can navigate any of them by analogy. Follow
this exactly; deviation is a smell.

## Steps

1. **Create the directory** `packages/<name>/` with this layout:

   ```
   packages/<name>/
   ├── package.json
   ├── tsconfig.json
   ├── CLAUDE.md
   └── src/
       └── index.ts        # the ONLY public entrypoint
   ```

2. **`package.json`** — name `@resonance/<name>`, `private: true`, `type: "module"`,
   `exports` pointing at `./src/index.ts` (and `./dist/index.js` for built consumers).
   Declare dependencies explicitly — if you import it, list it. Standard scripts:
   `build` (tsc), `typecheck` (tsc --noEmit), `lint` (eslint), `test` (vitest). Copy
   the shape from an existing package like `@resonance/core`.

3. **`tsconfig.json`** — `extends` `@resonance/tsconfig/node-library.json` (or
   `react-library.json` for a UI-bearing package).

4. **Dependencies & boundaries (ADR-0003):**
   - May depend on `@resonance/core` (shared types/Zod/ports), `@resonance/db`,
     `@resonance/ai` as needed.
   - **Must NOT** depend on a sibling _domain_ package (commerce ↮ community). Shared
     concepts go through `@resonance/core`.
   - Import only from public entrypoints (`@resonance/x`), never internals.

5. **`src/index.ts`** — re-export the package's public surface. Keep internals in other
   files under `src/` and only export what consumers need.

6. **`CLAUDE.md`** — write the package's context: what it is, its boundaries, what's
   real vs. stubbed, key types, and how it's tested. This is what an agent loads when
   working here. Match the tone of existing package CLAUDE.md files.

7. **Wire it up:** `pnpm install` (links the workspace), confirm `pnpm typecheck` and
   `pnpm lint` pass for the new package.

8. **Update the architecture diagram** — add the package node to
   `docs/architecture/resonance-architecture.drawio` (ADR-0015) via the
   `update-architecture-diagram` recipe. New package = diagram change, same PR.

## Done when

`pnpm install && pnpm --filter @resonance/<name> typecheck lint` is clean, the package
has a `CLAUDE.md`, and the diagram shows it.
