# Resonance — Build Handoff

> Working notes for resuming the scaffold. Delete once the project is past scaffolding.
> The authoritative "why" lives in `docs/adr/`; this file is just "where we are / what's next."

## Where we are (2026-06-20)

**Increment 1 (data + auth) COMPLETE and verified.** The reference vertical slice
(Creator Interview → ProfileGen, ADR-0013) is underway. Foundation decisions are locked
via `docs/adr/0001`–`0015`.

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
- App shell: `apps/web` Next.js App Router, boots + prerenders a landing page using the
  design system; Playwright + Vitest configured.
- Figma tokens in `.tmp-figma-tokens.md` (gitignored) — brand primary `#A855F7` final;
  neutrals/type/radius/shadow PROVISIONAL (Figma quota blocked deep reads — ADR-0012).

### Done (Increment 1 — data + auth)

Verified green: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm format:check`.

- **`@resonance/core`** — `MailPort` interface + `stubMail` added (the mail-seam port
  that `@resonance/auth` depends on).
- **`@resonance/db`** — REAL. Drizzle schema (`user`/`session`/`account`/`verification`
  Better Auth tables + `creator_profiles` + `embeddings` with pgvector HNSW index),
  migrations (`0000_enable_pgvector.sql`, `0001_pink_stone_men.sql`), query helpers
  (`createCreatorProfile`, `getCreatorProfileById`, `upsertProfileEmbedding`,
  `findSimilarProfiles`), and **PGlite in-memory test harness** (`createTestDb()`).
  Driver-agnostic `Db` type covers both Neon (prod) and PGlite (test). Fully tested.
- **`@resonance/auth`** — REAL. Better Auth magic-link over `@resonance/db`, roles
  stored as comma-encoded `text` via `encodeRoles`/`decodeRoles` (Better Auth has no
  array field type), `MailPort` seam via `resolveMail()` (fake under `RESONANCE_FAKES=1`;
  live Resend deferred to Increment 3), `getSession(headers)` → `SessionUser` for
  RSC/Server Actions, `createAuth({ db, mail })` injection seam used by integration
  tests. Fully tested mock-first.
- **`RESONANCE_FAKES` flag** added to `.env.example` (ADR-0016 seam — controls
  fake AI/email/PGlite for local dev; Increment 1 uses it for mail only).
- **Architecture diagram** updated: `@resonance/db` and `@resonance/auth` shown as REAL
  (green fill); Resend shown as deferred (dashed) since live transport is Increment 3.

### Next: Increment 2 — AI layer (not started)

Build the AI Gateway client, typed agent/tool registry, and embedding generation in
`@resonance/ai`. Needs its own plan. See ADR-0009, ADR-0010, ADR-0013.
Recommended: plan first, then implement in a focused session against the spec in
`docs/superpowers/specs/2026-06-17-creator-interview-profilegen-design.md`.

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
