# Resonance — Build Handoff

> Working notes for resuming the scaffold. Delete once the project is past scaffolding.
> The authoritative "why" lives in `docs/adr/`; this file is just "where we are / what's next."

## Update (2026-07-07) — agentic workflow tooling + firstmate

The **agentic workflow** is built and committed on `chore/agentic-workflow`: seeds
(planning) + mulch (memory, 10 domains + ADR index) + treehouse (worktrees) +
no-mistakes (gate) + lavish (review), governed by ADR-0016 and documented in
[docs/agentic-workflow.md](docs/agentic-workflow.md). Governance is wired into every
surface agents touch (SessionStart primes, skill loop-brackets, package `CLAUDE.md`
stanzas, `loop-guard` + `pnpm check:workspace` gates). The ProfileGen slice is
decomposed as seeds plan `pl-97aa` with `db`/`core` ready.

**Immediate next step: put it under firstmate orchestration** (parallel crewmates, one
per package) — follow the step-by-step in
[docs/firstmate-integration.md](docs/firstmate-integration.md). Prereqs (gh auth, tmux,
lavish CLI, PATH) are done; what remains is pushing the tooling onto the base branch and
launching + configuring firstmate.

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
- **`RESONANCE_FAKES` flag** added to `.env.example` (controls fake AI/email/PGlite for
  local dev; Increment 1 uses it for mail only). _Note: originally slated for an
  "ADR-0016" that was never written; 0016 is now the agentic-workflow ADR._
- **Architecture diagram** updated: `@resonance/db` and `@resonance/auth` shown as REAL
  (green fill); Resend shown as deferred (dashed) since live transport is Increment 3.

### Done (Increment 2 — AI layer)

Verified green: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm format:check`.

- **`@resonance/ai`** — REAL. AI SDK v6 via the Gateway (`provider/model` strings), the typed
  agent/tool registry driven by **one shared runner** (`runAgentStream` streaming +
  `runAgentStructured` tool-driven, throwing a typed `AgentError`), Voyage `voyage-3.5`
  embeddings (1024-dim, pinning the `vector(1024)` column), and the two agents:
  `creator-interview` (Sonnet, streaming) + `profile-gen` (Opus) with the **`saveProfile`** tool
  that persists → flips the user role → embeds → writes the embedding. Three swap seams
  (`resolveModel` / `resolveEmbedder` / the runner) each hide a live service + a fake, so the
  whole layer is verified mock-first with zero credentials. Model defaults:
  `anthropic/claude-sonnet-5` (interview) · `anthropic/claude-opus-4-8` (profile-gen).
- **Enabling foundations** folded in: `@resonance/core` gained `InterviewMessageSchema`
  (the shared chat contract); `@resonance/db` gained `setUserRoles` (the single write path for
  the `user.roles` column, so the `saveProfile` tool flips member→creator through the data layer).
- **Context-injection pattern** established: `defineProfileGenAgent({ userId, currentRoles, db,
embedder })` — the canonical seam for any tool needing server context (registry type untouched).

### Next: Increment 3 — UI + wiring + E2E (not started)

Build the streaming `WeaveRail` + `ProfileView` in `@resonance/ui` (Figma-derived), wire
`apps/web` (Better Auth routes, the interview streaming route handler, the `generateProfile`
Server Action, the `/profile/[id]` RSC), and the Playwright E2E driving the whole flow under
`RESONANCE_FAKES=1`. `profile-gen`'s fakes path needs a canned tool-calling model wired at the
Server Action (see `@resonance/ai` `resolveModel` note). See ADR-0013 and the design spec.

## How to resume / start a session

**Read [docs/working-with-agents.md](docs/working-with-agents.md) first** — it's the
guide to running a productive agent session here (kickoff prompt, scoping, recipes,
hygiene, maintenance contract).

- **Same Claude Code session:** from this directory, `claude --continue` (most recent)
  or `claude --resume` (pick from list); the IDE extension also lists recent sessions.
- **Fresh agent (no prior session):** point it at this repo and say "read `CLAUDE.md`,
  `HANDOFF.md`, `docs/working-with-agents.md`, `docs/agentic-workflow.md`, and
  `docs/adr/`, then build the reference slice (ADR-0013) via the agentic loop." The repo
  is self-describing by design — that's the whole point of ADR-0014.
- **Running the fleet:** to orchestrate with firstmate, follow
  [docs/firstmate-integration.md](docs/firstmate-integration.md) (includes a paste-able
  new-session kickoff prompt).

## Locked stack (quick ref)

Next.js App Router · pnpm + Turborepo · Neon Postgres + Drizzle + pgvector ·
Better Auth · Stripe Connect (stubbed) · Resend + React Email · AI SDK v6 via AI
Gateway (default Claude) + typed agent registry (durable workflows deferred —
ADR-0009) · shadcn + Figma tokens · RSC + Server Actions + TanStack Query · Zod ·
Vitest + RTL + Playwright.
