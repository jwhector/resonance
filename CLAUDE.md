# Resonance — Root Context

> **Audience: AI agents and humans doing work in this repo.** This file is loaded
> automatically as context. Keep it short, true, and high-signal. Detail lives in
> per-package `CLAUDE.md` files, `docs/adr/`, and `docs/conventions.md`.

## What Resonance is

An **AI-centric e-commerce and community platform**. It interviews people about
their passions and offerings, builds a profile for them, and connects them to
like-minded people — helping users find and support what **resonates** with them.

Two roles share one platform:

- **Creators** — onboard via an AI interview, get an AI-generated profile / visual
  identity / offerings, publish offerings, fulfill orders and services.
- **Members** — pick interests, discover creators/offerings via conversational
  search, follow, post, buy. A member can convert into a creator.

The AI assistant woven through the product is branded **Weave**.

## How this repo is organized (and why)

This is a **pnpm + Turborepo monorepo**. Business logic lives in framework-agnostic
`packages/*`; the Next.js app in `apps/web` is a **thin shell** that imports and
renders them. Package boundaries are also **context boundaries**: when you work on a
feature, load that package's `CLAUDE.md`, not the whole repo.

```
apps/web            Next.js App Router shell (UI, routing, wiring only)
packages/ui         Design system: shadcn primitives + Figma tokens + bespoke components
packages/core       Shared types, Zod schemas, domain primitives, ports (interfaces)
packages/db         Drizzle schema + client + migrations (Neon Postgres + pgvector)
packages/auth       Better Auth (magic-link), self-hosted on our DB
packages/ai         AI Gateway client + typed agent/tool registry + prompts + embeddings
packages/commerce   Orders, publishing, payments (Stripe Connect — modeled, mostly stubbed)
packages/community  Posts, follows, feed (mostly stubbed)
tooling/*           Shared tsconfig + eslint config
docs/adr            Architecture Decision Records — READ THESE before changing architecture
docs/architecture   Living architecture diagram (the visual index of the ADRs)
docs/conventions.md Coding conventions every package follows
docs/working-with-agents.md  How to run a productive agent session against this repo
.claude/skills      Recipes: how to do recurring tasks the Resonance way
```

> **New to a work session here?** Read [docs/working-with-agents.md](docs/working-with-agents.md)
> first — it covers how to scope a session, use the recipes/MCP/conventions, and keep
> the framework (ADRs + diagram + CLAUDE.md files) in sync as work lands.

## Golden rules

1. **Respect package boundaries.** Import from a package's public entrypoint
   (`@resonance/x`), never its internals. pnpm + lint enforce this. If you need
   something cross-cutting, it belongs in `@resonance/core`.
2. **Design deep modules.** A lot of behaviour behind a small interface, at a clean
   seam — the package's public entrypoint is its seam. Prefer a small interface over a
   shallow pass-through (ADR-0017, conventions.md § Module design).
3. **Logic lives in packages, not in `apps/web`.** The app composes and renders;
   it does not contain domain rules. This keeps logic extraction-ready (ADR-0002).
4. **Validate at every boundary with Zod.** Server Action inputs, AI tool inputs,
   external API payloads. Types are not validation.
5. **Secrets and AI orchestration stay server-side** (RSC / Server Actions / route
   handlers). Never ship a provider key to the client.
6. **Follow the recipes.** Recurring tasks (new domain package, new AI agent, new UI
   component from Figma, new DB migration) have a skill in `.claude/skills/`. Use it
   so the codebase stays uniform and agents can replicate the pattern.
7. **Record decisions as ADRs, and keep the diagram true.** A non-obvious
   architectural choice gets an ADR in `docs/adr/`. If it changes the system's shape
   (a package, service, dependency, or data flow), update
   `docs/architecture/resonance-architecture.drawio` **in the same change** — the
   diagram is a source of truth, not decoration (ADR-0015). Use the
   `update-architecture-diagram` recipe.
8. **Tests are not optional.** Vitest (unit/integration) + RTL (components) +
   Playwright (E2E). New behavior ships with tests (ADR-0011).
9. **No fakes in runtime code.** Shipped paths are **live-by-default**; fakes/mocks are
   **injected in tests** (DI), never chosen by an env flag inside runtime code. A
   credential-gated **live-smoke** check exercises each external service for real before
   release, so a green build can't hide broken live wiring (ADR-0018).
10. **Match the design; prove it with an artifact.** The Figma frame is the source of truth —
    read it, don't invent. UI parity is a **diff of two images** (`design/manifest/`
    `design.png` ⇄ `app.png`), never a prose claim: state it only as "matches `design.png`
    except [deltas]", keep unverified values `PROVISIONAL`, and cite only node ids present in a
    `metadata/` dump (ADR-0019). Build UI with the `add-ui-component-from-figma` recipe and
    verify with the pixel-diff loop.

## Stack at a glance

Next.js App Router · TypeScript · pnpm + Turborepo · PostgreSQL (Neon) + Drizzle +
pgvector · Better Auth · Stripe Connect · Resend + React Email · Vercel AI SDK v6
via AI Gateway (default Claude) · shadcn + Tailwind · TanStack Query (where
interactive) · Zod · Vitest + RTL + Playwright. Hosted on Vercel.

Full rationale for each: `docs/adr/`.

## Working in this repo

- `pnpm install` — install everything
- `pnpm dev` — run the app + watch packages
- `pnpm typecheck && pnpm lint && pnpm test` — what CI gates on
- Local edits trigger format/lint/typecheck via Claude Code hooks (`.claude/settings.json`)
- MCP servers are wired in `.mcp.json`: **Figma** (design source of truth),
  **Context7** (live library docs — prefer over memory for API usage), **Neon**
  (inspect dev DB), **Playwright** (drive/verify the app).

## Current status

Scaffold phase. The reference vertical slice is **Creator Interview → ProfileGen**
(see ADR-0013). Most of `commerce` and `community` are typed stubs. When a package
is a stub, its `CLAUDE.md` says so and lists what's real vs. pending.

## Agentic workflow

Work runs as one loop (**ADR-0016**): **seed → `ml prime` → worktree → firstmate
crewmate → no-mistakes gate → lavish review → `ml record`**. The seed id threads the
whole loop and returns to mulch as an evidence anchor. **Full reference:**
[docs/agentic-workflow.md](docs/agentic-workflow.md). To run an entire slice end-to-end
(plan → conditional parallel build → your review), invoke the **`/feature`** skill.

- **Orchestration — firstmate, one crewmate per package.** Boundaries are the
  parallelization boundary (ADR-0003): each package's work is an isolated crewmate in
  its own treehouse worktree. `gnhf` is **parked** (not the default).
- **Knowledge ownership — one fact, one home, by temperature.** **mulch** (hot, primed)
  = agent-discovered learnings + a `reference` index into the ADRs · **CLAUDE.md** (warm,
  always loaded) = stable rules + pointers · **ADRs** (cold, on-demand) = ratified
  decision + _why_ · **seeds** = work. An ADR holds the _why_, not the operative rule;
  don't restate a fact across stores — link. Full rule: ADR-0016.
- **Gates layer, don't stack.** The on-save hook does format/lint/typecheck (fast,
  local); the **no-mistakes** push gate and CI run `pnpm typecheck && pnpm lint &&
pnpm test`, scoped to Turbo-affected packages. Don't run the suite twice per change.
- **Review — use lavish** for anything visual (plans, the architecture diagram,
  Figma-derived UI), not ad-hoc HTML.

Current backlog: the ProfileGen slice is decomposed into a seeds plan — `sd plan show
pl-97aa`; run `sd ready` to claim the next unblocked step.

<!-- mulch:start -->

## Project Expertise (Mulch)

<!-- mulch-onboard:v0.10.7 -->

This project uses [Mulch](https://github.com/jayminwest/mulch) v0.10.7 for structured expertise management.

**At the start of every session**, run:

```bash
ml prime
```

Injects project-specific conventions, patterns, decisions, failures, references, and guides into
your context. Run `ml prime --files src/foo.ts` before editing a file to load only records
relevant to that path (per-file framing, classification age, and confirmation scores included).

For monolith projects where dumping every record wastes context, set
`prime.default_mode: manifest` in `.mulch/mulch.config.yaml` (or pass `--manifest`) to emit a
quick reference + domain index. Agents then scope-load with `ml prime <domain>` or
`ml prime --files <path>`.

**Before completing your task**, record insights worth preserving — conventions discovered,
patterns applied, failures encountered, or decisions made:

```bash
ml record <domain> --type <convention|pattern|failure|decision|reference|guide> --description "..."
```

Evidence auto-populates from git (current commit + changed files). Link explicitly with
`--evidence-seeds <id>` / `--evidence-gh <id>` / `--evidence-linear <id>` / `--evidence-bead <id>`,
`--evidence-commit <sha>`, or `--relates-to <mx-id>`. Upserts of named records merge outcomes
instead of replacing them; validation failures print a copy-paste retry hint with missing fields
pre-filled.

Run `ml status` for domain health, `ml doctor` to check record integrity (add `--fix` to strip
broken file anchors), `ml --help` for the full command list. Write commands use file locking and
atomic writes, so multiple agents can record concurrently. Expertise survives `git worktree`
cleanup — `.mulch/` resolves to the main repo.

`ml prune` soft-archives stale records to `.mulch/archive/` instead of deleting them; pass
`--hard` for true deletion. Restore an archived record with `ml restore <id>`. Do not read
`.mulch/archive/` directly — those records are stale by definition. If you need historical
context, run `ml search --archived <query>`.

### Before You Finish

If you discovered conventions, patterns, decisions, or failures worth preserving during
this session, record them before closing:

```bash
ml learn                                                                    # see what files changed
ml record <domain> --type <convention|pattern|failure|decision|reference|guide> --description "..."
ml sync                                                                     # validate, stage, commit
```

Skip if no insight surfaced. Unrecorded learnings are lost; ritual filler records are also noise.

<!-- mulch:end -->

<!-- seeds:start -->

## Issue Tracking (Seeds)

<!-- seeds-onboard:v0.5.14 -->
<!-- seeds-onboard-schema:7 -->

This project uses [Seeds](https://github.com/jayminwest/seeds) v0.5.14 for git-native issue tracking.

**At the start of every session**, run:

```
sd prime
```

This injects session context: rules, command reference, and workflows. Pass `--format json|compact|markdown|plain|ids` on any command for agent-friendly output.

**Quick reference:**

- `sd ready` — Find unblocked work
- `sd search <query>` — Full-text search across titles + descriptions
- `sd create --title "..." --type task --priority 2` — Create issue
- `sd update <id> --status in_progress` — Claim work
- `sd close <id>` — Complete work
- `sd dep add <id> <depends-on>` — Add dependency between issues
- `sd sync` — Sync with git (run before pushing)

### Planning

Use `sd plan` when work is large or ambiguous enough that an LLM benefits from structured decomposition. Submit spawns one child seed per step; `step.blocks` uses forward semantics (step i with `blocks: [j]` means step i blocks step j, and step j gets step i's id in its `blockedBy`).

- `sd plan templates` — List built-ins (`feature`, `bug`, `refactor`) plus custom templates
- `sd plan prompt <seed-id>` — Emit a structured prompt the LLM fills in
- `sd plan submit <seed-id> --plan <file>` — Validate + spawn child seeds
- `sd plan show <pl-id>` — View sections, children, sub-plans
- `sd plan edit <id> [--name | --section <name> <text> | --step <i> --title/--priority/--type]` — In-place field edits; bumps revision
- `sd plan outcome <pl-id> --result success|partial|failure` — Record outcome (storage-only)
- `sd plan review <pl-id> --by <name>` — Record reviewer (informational)

### Before You Finish

1. Close completed issues: `sd close <id>`
2. File issues for remaining work: `sd create --title "..."`
3. Sync and push: `sd sync && git push`
<!-- seeds:end -->
