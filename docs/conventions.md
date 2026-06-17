# Resonance Conventions

Conventions every package follows. These exist so the codebase reads as if one
careful person wrote it — which lets agents replicate patterns instead of inventing
them. When in doubt, match surrounding code.

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
