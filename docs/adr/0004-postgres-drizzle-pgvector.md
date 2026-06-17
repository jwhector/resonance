# ADR-0004: PostgreSQL (Neon) + Drizzle + pgvector

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

Resonance has genuinely relational, transactional data — orders, line items,
follows, payments, profiles — plus a need for semantic similarity ("resonance")
matching. We target Vercel; Vercel Postgres is retired in favor of Marketplace DBs.

## Decision

- **PostgreSQL on Neon** (serverless, Vercel-native) as the primary database.
- **Drizzle** as the ORM/query layer, in `@resonance/db`. Schema is plain TypeScript;
  queries read like SQL — legible for agents, no hidden query magic, edge-friendly.
- **pgvector** extension for embeddings, so matching is transactional with the rest of
  the data and needs no separate vector service (see ADR-0010).

All DB access goes through `@resonance/db`. Other packages never open their own
connection.

## Consequences

- One datastore for relational + vector data; simpler ops, consistent transactions.
- Drizzle's SQL-first style keeps queries inspectable; migrations are explicit files.
- pgvector scales comfortably into the hundreds of thousands of rows; revisit a
  dedicated vector DB only if scale demands it.

## Alternatives considered

- **Prisma:** mature, but a separate schema DSL + codegen and a more "magical" query
  abstraction — more for an agent to reason about.
- **Kysely:** great control, but lower-level than we want at the start.
- **Dedicated vector DB (Pinecone/Turbopuffer):** premature; another service to sync.
