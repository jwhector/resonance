# Resonance Conventions

Conventions every package follows. These exist so the codebase reads as if one
careful person wrote it — which lets agents replicate patterns instead of inventing
them. When in doubt, match surrounding code.

## Module design — deep modules

The overarching design tenet the rest of these conventions serve: design **deep
modules** — a lot of behaviour behind a small **interface**, placed at a clean **seam**,
testable through that interface. Use the exact vocabulary so design intent stays
reviewable. The full teaching is in the [`module-design`](../.claude/skills/module-design/SKILL.md)
skill; the _why_ and the Resonance mapping are ratified in
[ADR-0017](adr/0017-design-deep-modules.md). This section is the operative rule.

**Vocabulary** (don't substitute "component/service/API/layer"):

- **Module** — anything with an interface and an implementation (function → package →
  slice). A `@resonance/*` package is a module.
- **Interface** — everything a caller must know: the signature _and_ invariants, error
  modes, ordering, required config, performance. Broader than "API."
- **Depth** — behaviour exercised per unit of interface learned. Deep = small interface
  over large implementation; **shallow** = interface ≈ implementation (a pass-through
  that only adds surface — avoid).
- **Seam** — where an interface lives; a place you can swap behaviour without editing
  there. A package's `src/index.ts` is a seam; a **port** is a finer seam.
- **Adapter** — a concrete thing satisfying an interface at a seam.
- **boundary vs seam** — "boundary" keeps its ADR-0003 sense (the package / context /
  ownership unit); "seam" is the finer-grained location of an interface. A package
  boundary _is_ one kind of seam.

**When designing an interface, ask** (aim to shrink it):

1. Can I reduce the number of methods?
2. Can I simplify the parameters?
3. Can I hide more complexity inside?

**Depth checks:**

- **The deletion test.** Imagine deleting the module. If complexity vanishes, it was a
  pass-through (shallow). If complexity reappears across N callers, it earned its keep.
- **The interface is the test surface.** Callers and tests cross the same seam. Wanting
  to test _past_ the interface means the module is the wrong shape — fix the shape, don't
  reach around it.
- **One adapter = a hypothetical seam; two = a real one.** Don't introduce a seam unless
  something varies across it. A **test fake counts as the second adapter** when the real
  variance is known/imminent (this is why the model-ahead ports — `StoragePort`,
  `PaymentsPort` — are legitimate; see ADR-0017). Avoid a single-adapter seam with no
  known variance.

**Design for testability** (these fall out of depth):

- **Accept dependencies, don't create them.** `createAuth({ db, mail })` and
  `Db`-as-first-arg, not a function that news up its own client.
- **Return results, don't produce side effects.** `calculateDiscount(cart): Discount`,
  not `applyDiscount(cart): void` that mutates.
- **Small surface area.** Fewer methods = fewer tests; fewer params = simpler setup.

**Recording design learnings.** When you record a design insight to mulch, use this
vocabulary ("shallow module," "leaky seam," "deps created not accepted") so records stay
consistent and searchable across sessions.

**Reviewing for depth.** Code review flags module-depth smells against
[docs/review-checklist.md](review-checklist.md) — shallow module, leaky interface,
test-past-the-interface, deps created-not-accepted, side-effects-not-results.

## TypeScript

- **Strict everywhere.** `strict`, `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters`
  are on in `tooling/tsconfig/base.json`. Don't loosen per-package.
- **`type`-only imports** for types (`import type { X }`). Enforced by lint.
- **No `any`.** Use `unknown` + narrowing, or a real type. `any` is a lint warning;
  treat it as a smell to remove.
- **Prefer `type` aliases** for object shapes; `interface` only when declaration
  merging is genuinely needed.
- **Export public API from the package's `src/index.ts`.** Nothing outside a package
  may import its internals (lint-enforced).

## Validation — Zod at boundaries

Every value crossing a trust/serialization boundary is parsed with a Zod schema:

- Server Action arguments
- AI tool inputs (the model produces them — never trust the shape)
- External API responses (Stripe webhooks, etc.)
- Environment variables (each app/package validates its own `env` at startup)

Co-locate schemas with the domain type. Infer the TS type from the schema
(`type Foo = z.infer<typeof FooSchema>`) so they can't drift.

## Packages & boundaries

- `@resonance/core` holds cross-cutting types, Zod schemas, and **ports**
  (interfaces like `StoragePort`) — things multiple packages depend on.
- Domain packages (`commerce`, `community`) depend on `core`, `db`, `ai` — never on
  each other directly. Cross-domain coordination happens in the app layer or via
  `core` events/types.
- A package's `package.json` lists exactly what it imports. If you import it, declare
  it. No phantom dependencies (this is why we use pnpm strictly — ADR-0003).

## Naming

- Files: `kebab-case.ts`. React components: `PascalCase.tsx`.
- Directories: `kebab-case`.
- Database tables: `snake_case`, plural (`creator_profiles`). Drizzle column keys:
  `camelCase` mapping to `snake_case`.
- Zod schemas: `FooSchema`; inferred type: `Foo`.
- AI agents in the registry: `kebab-case` ids (`creator-interview`, `profile-gen`).

## Errors

- Throw typed errors from `@resonance/core` (e.g. `ResonanceError` subclasses), not
  bare strings. Include a stable `code`.
- Validate at boundaries (user input, external APIs); **trust internal calls** — do
  not defensively re-validate data that already passed a boundary schema.
- Don't swallow errors. Let them propagate to a boundary that can report them.

## React / Next.js

- **Server Components by default.** Add `"use client"` only when a component needs
  interactivity, browser APIs, or client state.
- **Mutations via Server Actions**, validated with Zod, returning typed results.
- **TanStack Query only for genuinely interactive client surfaces** (infinite feed,
  optimistic likes). Don't use it as the default data layer — that's RSC's job (ADR-0008b).
- Keep components presentational; push logic into package functions the component calls.

## AI code

- Every AI feature is a **typed agent** in `@resonance/ai`'s registry: id, system
  prompt, declared tools (with Zod input schemas), output schema, model. Run through
  the shared runner — don't hand-roll streaming/tool loops (ADR-0009).
- Default model selection: Haiku for cheap classification, Sonnet for chat/interview,
  Opus for heavy generation. Route via the AI Gateway with `"provider/model"` strings.
- Prompts live in files next to the agent, not inlined in business logic.

## Testing

- Unit/integration: **Vitest**, co-located `*.test.ts` next to source.
- Components: **React Testing Library** (`*.test.tsx`).
- E2E: **Playwright** in `apps/web/e2e`.
- **Test-only fakes live behind a package's `./testing` subpath** (`@resonance/x/testing`), never
  the main entrypoint, and are supplied via **DI** — never selected by a runtime env flag
  (ADR-0018). Use the `/testing` suffix **uniformly** (`@resonance/db/testing`,
  `@resonance/auth/testing`, `@resonance/ai/testing`); do **not** use `/test` — it collides with
  the Vercel AI SDK's own `ai/test` import. The one sanctioned exception to "no runtime fake
  selection" is a single, isolated, clearly-named **E2E-only harness**
  (`apps/web/lib/e2e-harness.ts`, gated on `E2E_HARNESS`) — ADR-0018 §4.
- Write the test with the behavior. Bug fixes start with a failing test.

## Commits & ADRs

- Conventional-ish commit subjects (`feat:`, `fix:`, `chore:`, `docs:`).
- Architectural decisions → an ADR in `docs/adr/`. Supersede, don't silently
  contradict.
- **Keep the architecture diagram in sync.** If a change adds/removes/renames a
  package or service, adds a dependency or data flow, or turns a stub into a real
  implementation, update `docs/architecture/resonance-architecture.drawio` and
  regenerate its outputs **in the same PR** (ADR-0015). The
  `update-architecture-diagram` recipe walks the validate → regenerate steps. A stale
  diagram is treated as a bug.
