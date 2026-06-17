# ADR-0010: "Resonance" matching via pgvector embeddings

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

The product's namesake feature is connecting people to what "resonates" with them —
recommending creators and offerings aligned with a member's interests, and connecting
like-minded people. This is fundamentally semantic similarity, not keyword matching.

## Decision

Compute matching with **embeddings stored in Postgres via pgvector**. Embed
profiles, offerings, posts, and interests (Voyage embeddings via the AI Gateway);
match by vector similarity, optionally filtered by metadata (tags, role, region).
Embeddings live in `@resonance/db`; embedding generation lives in `@resonance/ai`.

The reference slice seeds this backbone: a generated creator profile is embedded and
stored, proving the pipeline end-to-end before there is a corpus to match against.

## Consequences

- One datastore, transactional with the rest of the data (ADR-0004); scales well into
  the hundreds of thousands of rows.
- "Select 3 topics" tags become metadata filters layered on top of similarity.
- Re-embedding all content after a model change is a bulk job — a likely first
  trigger for durable workflows (ADR-0009).

## Alternatives considered

- **Dedicated vector DB (Pinecone/Turbopuffer):** scales further, but another service
  to operate and keep consistent with Postgres — premature.
- **Tags/keywords only:** sidesteps the defining feature and leaves the data model
  not embedding-ready.
