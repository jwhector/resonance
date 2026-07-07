# web (apps/web)

The Next.js App Router **shell**: UI composition, routing, and wiring only. It imports
the `@resonance/*` packages and renders them — it holds **no domain logic** (ADR-0002).
Logic that feels like it belongs here almost always belongs in a package, so it stays
extraction-ready.

## Status: SCAFFOLD

Only the scaffold home page (`app/page.tsx`, `app/layout.tsx`) and an e2e smoke test
(`e2e/home.spec.ts`) exist. The reference-slice **Creator Interview → ProfileGen**
route (Server Actions wiring `ui` ↔ `ai` ↔ `db` behind creator auth) is the next thing
built here — see ADR-0013 and the `web`-labelled seed.

## What's here

```
app/
├── layout.tsx        root layout
├── page.tsx          scaffold home page
└── globals.css       Tailwind entry + token wiring
e2e/
└── home.spec.ts      Playwright smoke test
```

Depends on every `@resonance/*` package plus `next`, `react`, `@tanstack/react-query`,
and `zod`.

## Rules

- **Thin shell (ADR-0002).** Compose and render; never put domain rules here. If you
  reach for business logic, move it into the relevant package and import it.
- **Import from package public entrypoints only** (`@resonance/x`), never their `src/`
  internals — the boundary is enforced by lint.
- **Validate every boundary with Zod** — Server Action inputs, route handler payloads,
  external webhooks. Types are not validation (golden rule 3).
- **Secrets + AI orchestration stay server-side** — RSC, Server Actions, route handlers
  only. Never ship a provider key or run an agent on the client (golden rule 4).
- **RSC + Server Actions by default; TanStack Query only where interactive** (ADR-0008).
- New behavior ships with tests — RTL for components, Playwright for flows (ADR-0011).

## Working here (seeds + mulch)

Work in the web shell is tracked by a `web`-labelled seed — `sd ready` / `sd search web` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`web`** mulch domain: `ml record web --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
