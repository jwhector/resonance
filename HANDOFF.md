# Resonance — Build Handoff

> Working notes for resuming the scaffold. Delete once the project is past scaffolding.
> The authoritative "why" lives in `docs/adr/`; this file is just "where we are / what's next."

## Where we are (2026-06-17)

**Foundation phase COMPLETE and verified.** At the **checkpoint** before the reference
vertical slice. Decisions are locked via the design interview — see `docs/adr/0001`–`0015`.

Approach: **foundation first → checkpoint (here) → then build the vertical slice**
(Creator Interview → ProfileGen, ADR-0013).

Verified green: `pnpm typecheck`, `pnpm lint`, `pnpm test` (15/15), `pnpm build`
(Next app prerenders), `pnpm format:check`.

### Done (foundation)

- Monorepo skeleton: `pnpm-workspace.yaml`, `turbo.json`, root `package.json`,
  `.gitignore`, `.npmrc`, `.nvmrc` (Node 24, pnpm 11).
- Shared tooling: `tooling/tsconfig/*`, `tooling/eslint-config/*`, `prettier.config.mjs`.
- Agentic context layer: root `CLAUDE.md`, per-package `CLAUDE.md` (×7),
  `docs/conventions.md`, ADRs `0000`–`0015`.
- **Architecture diagram** (`docs/architecture/`) — drawio source + SVG/PNG, wired into
  docs as a living source of truth (ADR-0015) + `update-architecture-diagram` recipe.
- Automation: `.claude/settings.json` (format-on-save hook), `.claude/hooks/post-edit.sh`,
  `.mcp.json` (Figma·Context7·Neon·Playwright), `.github/workflows/ci.yml`,
  `.env.example`, `.githooks/pre-commit`.
- Recipes: `.claude/skills/{update-architecture-diagram,scaffold-domain-package,
add-ai-agent,add-ui-component-from-figma,add-db-migration}/SKILL.md`.
- Design system: `@resonance/ui` — Tailwind v4 token theme + typed tokens + `cn()` +
  `Button` primitive + `CLAUDE.md`.
- Packages: `core` (real: errors, `StoragePort`, `Role`), `db` `auth` `ai`
  (`ai` has the typed agent-registry shape), `commerce` `community` (stubs). Each typed,
  bounded, with `CLAUDE.md`.
- App shell: `apps/web` Next.js App Router, boots + prerenders a landing page using the
  design system; Playwright + Vitest configured.
- Figma tokens in `.tmp-figma-tokens.md` (gitignored) — brand primary `#A855F7` final;
  neutrals/type/radius/shadow PROVISIONAL (Figma quota blocked deep reads — ADR-0012).

Foundation checkpoint items are **done**: `.claude/settings.json` save hook created,
and the foundation committed to `main` (`chore: scaffold foundation + agentic
engineering layer`).

### Next: the reference vertical slice (not started)

Build Creator Interview → ProfileGen end-to-end (auth + db + ai registry + UI from
Figma + embeddings + tests), authoring/using each recipe as it goes. See ADR-0013.
Recommended shape: **plan first, then build in focused per-layer sessions** (data+auth
→ ai → ui+wiring+E2E). See [docs/working-with-agents.md](docs/working-with-agents.md).

## How to resume / start a session

**Read [docs/working-with-agents.md](docs/working-with-agents.md) first** — it's the
guide to running a productive agent session here (kickoff prompt, scoping, recipes,
hygiene, maintenance contract).

- **Same Claude Code session:** from this directory, `claude --continue` (most recent)
  or `claude --resume` (pick from list); the IDE extension also lists recent sessions.
- **Fresh agent (no prior session):** point it at this repo and say "read `CLAUDE.md`,
  `HANDOFF.md`, `docs/working-with-agents.md`, and `docs/adr/`, then build the reference
  slice (ADR-0013), starting with a plan." The repo is self-describing by design —
  that's the whole point of ADR-0014.

## Locked stack (quick ref)

Next.js App Router · pnpm + Turborepo · Neon Postgres + Drizzle + pgvector ·
Better Auth · Stripe Connect (stubbed) · Resend + React Email · AI SDK v6 via AI
Gateway (default Claude) + typed agent registry (durable workflows deferred —
ADR-0009) · shadcn + Figma tokens · RSC + Server Actions + TanStack Query · Zod ·
Vitest + RTL + Playwright.
