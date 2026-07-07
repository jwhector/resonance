# @resonance/db

The single data-access layer: Drizzle ORM over Neon Postgres, with pgvector for
embeddings (ADR-0004, ADR-0010). **Every** DB read/write in the system goes through
here — no other package opens a connection.

## Status: REAL

Schema, client, migrations, and query helpers are all in place (Creator Interview →
ProfileGen reference slice — see `docs/superpowers/specs/2026-06-17-creator-interview-profilegen-design.md`).

## What's here

```
src/
├── client.ts                   createDb() — Neon serverless HTTP driver (production)
├── types.ts                    type Db — union type for Neon (prod) + PGlite (test)
├── schema/
│   ├── auth.ts                 Better Auth tables: user, session, account, verification
│   ├── creator.ts              creator_profiles, embeddings (+ Zod schemas)
│   └── index.ts                re-exports both schema files
├── queries/
│   └── profiles.ts             createCreatorProfile, getCreatorProfileById,
│                               upsertProfileEmbedding, findSimilarProfiles
└── testing/
    └── create-test-db.ts       createTestDb() — PGlite in-memory harness (dev/test only)
migrations/
    0000_enable_pgvector.sql    Hand-written: enables pgvector extension (runs first)
    0001_pink_stone_men.sql     drizzle-kit generated: auth + creator_profiles + embeddings
```

## Public API

Import from `"@resonance/db"` for production code; `"@resonance/db/testing"` for tests.
The `./testing` subpath is behind a separate package.json export so PGlite never lands
in production bundles.

**`@resonance/db`** — main entrypoint (`src/index.ts`):

```ts
export * from "./schema"; // tables + Zod schemas (OfferingSchema, etc.)
export type { Db } from "./types"; // union Drizzle type (Neon | PGlite)
export { createDb } from "./client"; // production client factory
export {
  createCreatorProfile,
  getCreatorProfileById,
  upsertProfileEmbedding,
  findSimilarProfiles,
  type CreatorProfileRow,
} from "./queries/profiles";
```

The PGlite test harness is exported ONLY from the `@resonance/db/testing` subpath
(keeps PGlite out of production bundles) — it is not part of the main entrypoint.

**`@resonance/db/testing`** — separate import path (`src/testing/create-test-db.ts`):

```ts
export { createTestDb, type TestDb } from "./testing/create-test-db";
```

## Tables

### Better Auth tables (`schema/auth.ts`)

`user`, `session`, `account`, `verification` — singular names are the **sanctioned
naming exception**: Better Auth owns these shapes and names. PKs are `text` (Better
Auth generates string IDs, not UUIDs). The `user` table adds a `roles` column
(`text`, comma-encoded `Role[]`, default `"member"`) as a Better Auth `additionalField`.

### `creator_profiles` (`schema/creator.ts`)

`uuid` PK, `userId` (FK → `user.id`, text), `displayName`, `headline`, `bio`,
`tags` (jsonb `string[]`), `offerings` (jsonb `Offering[]`), `status`
(`"draft" | "ready"`), timestamps. Accompanying Zod schemas: `OfferingSchema`,
`ProfileStatusSchema`, `CreatorProfileInputSchema`.

### `embeddings` (`schema/creator.ts`)

Generic, polymorphic vector store. Columns: `sourceType` (open-ended enum),
`sourceId` (uuid of the source row), `model` (embedding model ID), `content` (text
that was embedded), `embedding` (`vector(1024)`). Unique index on
`(sourceType, sourceId, model)` so `upsertProfileEmbedding` is idempotent.
HNSW index (`vector_cosine_ops`) for ANN search.

**No embeddings are generated yet.** The schema and `upsertProfileEmbedding`
helper are in place, but the AI call that produces vectors is not wired up until
Increment 2 of the reference slice lands. Once it does, only `"creator_profile"`
vectors will be produced. The other values in `EMBEDDING_SOURCE_TYPES`
(`"offering"`, `"post"`, `"interest"`) are reserved for future slices — see
_Future evolution_ in the design spec.

**Embedding dimensions are pinned to 1024** — matching Voyage `voyage-3.5`, the
model used by `@resonance/ai`.

## Migrations

- Generated with `drizzle-kit generate` (`pnpm db:generate`) and committed alongside
  the schema change. Use the `add-db-migration` recipe.
- **Never hand-edit generated SQL** without noting it explicitly. The one exception is
  `0000_enable_pgvector.sql`, which enables the `vector` Postgres extension — this
  must run before any table that uses `vector(...)` columns, and drizzle-kit cannot
  generate it.
- Applied in production with `pnpm db:migrate` (runs `drizzle-kit migrate` against
  `DATABASE_URL`). Applied in tests automatically by `createTestDb()` via the
  `drizzle-orm/pglite/migrator`.

## Neon in prod / PGlite in tests

| Context    | Driver                          | How                                                   |
| ---------- | ------------------------------- | ----------------------------------------------------- |
| Production | `@neondatabase/serverless` HTTP | `createDb(connectionString)` → `NeonHttpDatabase`     |
| Tests      | `@electric-sql/pglite`          | `createTestDb()` → in-memory, migrations auto-applied |

`type Db` covers both via `PgDatabase<PgQueryResultHKT, typeof schema, ...>`. Pass
a `Db` into query helpers rather than the singleton so tests can inject `TestDb`.

## Rules

- Import only from the package's public entrypoint. Never reach into `src/` internals.
- Query helpers take `Db` as their first argument — dependency-injectible for tests.
- Tables are `snake_case` (Postgres) with Drizzle `camelCase` keys (JS). Index every
  column used in a `WHERE` or `JOIN`.
- `zod` is a direct dependency (boundary validation of insert shapes). Schema-level Zod
  schemas live in `schema/*.ts` alongside the Drizzle table definitions.
- Depends only on `@resonance/core`. Domain packages depend on this; it does not depend
  on any domain package.
- No `any`. Use `import type` / `export type` for type-only imports/exports.

## Working here (seeds + mulch)

Work in this package is tracked by a `db`-labelled seed — `sd ready` / `sd search db` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`db`** mulch domain: `ml record db --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
