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
2. **Logic lives in packages, not in `apps/web`.** The app composes and renders;
   it does not contain domain rules. This keeps logic extraction-ready (ADR-0002).
3. **Validate at every boundary with Zod.** Server Action inputs, AI tool inputs,
   external API payloads. Types are not validation.
4. **Secrets and AI orchestration stay server-side** (RSC / Server Actions / route
   handlers). Never ship a provider key to the client.
5. **Follow the recipes.** Recurring tasks (new domain package, new AI agent, new UI
   component from Figma, new DB migration) have a skill in `.claude/skills/`. Use it
   so the codebase stays uniform and agents can replicate the pattern.
6. **Record decisions as ADRs, and keep the diagram true.** A non-obvious
   architectural choice gets an ADR in `docs/adr/`. If it changes the system's shape
   (a package, service, dependency, or data flow), update
   `docs/architecture/resonance-architecture.drawio` **in the same change** — the
   diagram is a source of truth, not decoration (ADR-0015). Use the
   `update-architecture-diagram` recipe.
7. **Tests are not optional.** Vitest (unit/integration) + RTL (components) +
   Playwright (E2E). New behavior ships with tests (ADR-0011).

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
