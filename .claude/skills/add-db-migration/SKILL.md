---
name: add-db-migration
description: Use when changing the database schema in @resonance/db — adding/altering a table or column, an index, or a pgvector embedding column. Edits the Drizzle schema, generates a migration, and keeps schema, migration, and the architecture diagram consistent (ADR-0004, ADR-0010).
---

# Recipe: Add a database migration

All schema lives in `@resonance/db` as Drizzle TypeScript. Migrations are explicit
files generated from the schema — never hand-edit generated SQL unless you must, and
if you do, say so in the PR.

## Steps

1. **Edit the schema** in `packages/db/src/schema/` (one file per domain area, e.g.
   `creator.ts`, `commerce.ts`). Conventions:
   - Tables: `snake_case`, plural (`creator_profiles`). Drizzle column keys
     `camelCase` mapping to `snake_case`.
   - Timestamps: `createdAt` / `updatedAt` with defaults.
   - Foreign keys explicit; add indexes for columns you'll filter/join on.
   - **Embeddings (ADR-0010):** use a `vector(<dims>)` column (pgvector) with an
     appropriate index (e.g. HNSW) for similarity search. Keep embedding dims in sync
     with the Voyage model used in `@resonance/ai`.

2. **Define/extend the Zod schema** for the row type alongside it (or in
   `@resonance/core` if shared), so inserts/reads are validated at the boundary.

3. **Generate the migration:**

   ```bash
   pnpm --filter @resonance/db db:generate    # drizzle-kit generate
   ```

   Review the generated SQL in `packages/db/migrations/`. Commit schema + migration
   together.

4. **Apply locally** against your dev Neon branch:

   ```bash
   pnpm --filter @resonance/db db:migrate
   ```

   (Requires `DATABASE_URL`. Use a dev/branch DB — never run untested migrations on a
   shared environment.)

5. **Inspect** with the Neon MCP if you want to confirm the live schema matches.

6. **Test** (ADR-0011): integration-test new queries against a test DB.

7. **Diagram:** schema-internal changes don't change the architecture diagram. A new
   _external_ data store or a new data flow between components does (ADR-0015).

## Done when

`pnpm --filter @resonance/db typecheck` is clean, the migration is generated and
applied to your dev branch, and queries are tested.
