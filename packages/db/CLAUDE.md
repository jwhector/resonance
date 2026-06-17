# @resonance/db

The single data-access layer: Drizzle ORM over Neon Postgres, with pgvector for
embeddings (ADR-0004, ADR-0010). **Every** DB read/write in the system goes through
here — no other package opens a connection.

## Status: SKELETON

Real schema + client land in the reference slice (ADR-0013). Planned layout:

```
src/
├── client.ts             Drizzle client (Neon serverless driver)
├── schema/               One file per domain area (creator.ts, commerce.ts, …)
│   └── creator.ts        users, creator_profiles, embeddings (vector column)
└── index.ts              Public surface: client factory + schema + query helpers
migrations/               drizzle-kit generated SQL (committed)
```

## Rules (when building it out)

- Tables `snake_case` plural; Drizzle keys `camelCase`. Indexes on filtered/joined cols.
- Embeddings: pgvector `vector(<dims>)` + HNSW index; dims match the Voyage model in
  `@resonance/ai`.
- Migrations are generated (`db:generate`) and committed with the schema change. Use
  the `add-db-migration` recipe. Never hand-edit generated SQL without saying so.
- Depends only on `@resonance/core`. Domain packages depend on this; it depends on no
  domain package.
