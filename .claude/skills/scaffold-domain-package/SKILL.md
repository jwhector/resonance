---
name: scaffold-domain-package
description: Use when adding a new package to the Resonance monorepo — a domain package (e.g. messaging, reviews) or a platform package. Creates the package with the standard layout, boundaries, tsconfig, and its own CLAUDE.md so it matches every other package (ADR-0003).
---

# Recipe: Scaffold a domain package

Every package looks the same so agents can navigate any of them by analogy. Follow
this exactly; deviation is a smell.

**Deep-module framing.** A `@resonance/*` package is a **deep module**: design the
smallest `src/index.ts` **interface** that delivers the behaviour — that entrypoint is
the package's **seam**, so hide internals behind it and export only what callers need
(Steps 5–6). Before you commit to the surface, run the **deletion test**: if deleting
the package would scatter the same complexity across N callers it earned its keep, but
if the interface is nearly as wide as the implementation you've built a **shallow**
pass-through — collapse it or fold it into `@resonance/core`. Vocabulary and rule:
[`conventions.md` § Module design](../../../docs/conventions.md) and
[ADR-0017](../../../docs/adr/0017-design-deep-modules.md).

## Loop bracket (seeds + mulch)

This recipe runs inside the agentic loop (root CLAUDE.md → _Agentic workflow_, ADR-0016):

- **Before you start** — claim the seed (`sd ready` → `sd update <id> --status in_progress`) and `ml prime architecture` for prior scaffolding decisions.
- **Part of the recipe** — a new package is a new context boundary, so **register it as a mulch domain** (`ml add <name>`), give its `CLAUDE.md` the standard _Working here (seeds + mulch)_ stanza, index its ADR with a `reference` record, and add it to the root CLAUDE.md tree (Steps 6 and 9). `pnpm check:workspace` verifies the wiring.
- **When you finish** — record the scaffolding decision to the **`architecture`** mulch domain (`ml record architecture --type decision --description "..." --evidence-seeds <id>`), update the diagram, push through the gate, then `sd close <id>`.

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

9. **Register in the knowledge layer (keep the framework self-healing):**
   - **Mulch domain:** `ml add <name>` — creates `.mulch/expertise/<name>.jsonl`.
   - **ADR index:** `ml record <name> --type reference --classification foundational --name "ratified decisions (ADR index)" --files docs/adr/NNNN-<slug>.md --dir-anchor packages/<name> --tags "adr,ratified-decision" --description "<one-line decision> — open ADR-NNNN before changing."` — **pass `--files` explicitly**, or `ml` auto-fills `files[]` with the whole changeset and pollutes the record.
   - **Root CLAUDE.md tree:** add the package to the "How this repo is organized" list.
   - Run **`pnpm check:workspace`** — it fails if a package lacks a `CLAUDE.md` or a mulch domain (the same check gates CI).

## Done when

`pnpm install && pnpm --filter @resonance/<name> typecheck lint` is clean, the package
has a `CLAUDE.md`, the diagram shows it, and **`pnpm check:workspace` passes** (CLAUDE.md

- mulch domain wired, ADR indexed).
