# Architecture Decision Records

Each ADR records one significant decision: the context, the choice, and its
consequences. They are the **"why"** behind the codebase — read them before
changing architecture, and add/supersede one when you make a new decision.

These were seeded from the founding design interview (2026-06-16).

| ADR                                                       | Decision                                                                | Status   |
| --------------------------------------------------------- | ----------------------------------------------------------------------- | -------- |
| [0001](0001-monorepo-turborepo-pnpm.md)                   | Monorepo with Turborepo + pnpm                                          | Accepted |
| [0002](0002-nextjs-app-router-web-only.md)                | Next.js App Router; web-only, extraction-ready logic                    | Accepted |
| [0003](0003-package-boundaries-as-context-boundaries.md)  | Package boundaries are agent context boundaries                         | Accepted |
| [0004](0004-postgres-drizzle-pgvector.md)                 | PostgreSQL (Neon) + Drizzle + pgvector                                  | Accepted |
| [0005](0005-auth-better-auth.md)                          | Better Auth (self-hosted magic-link)                                    | Accepted |
| [0006](0006-payments-stripe-connect.md)                   | Stripe Connect — modeled now, stubbed impl                              | Accepted |
| [0007](0007-media-storage-deferred.md)                    | Media storage deferred behind a `StoragePort`                           | Accepted |
| [0008](0008-rendering-and-data.md)                        | RSC + Server Actions; TanStack Query where interactive                  | Accepted |
| [0009](0009-ai-architecture.md)                           | AI SDK v6 via Gateway, typed agent registry; durable workflows deferred | Accepted |
| [0010](0010-matching-pgvector-embeddings.md)              | "Resonance" matching via pgvector embeddings                            | Accepted |
| [0011](0011-testing-strategy.md)                          | Vitest + RTL + Playwright                                               | Accepted |
| [0012](0012-design-system-shadcn-figma-tokens.md)         | shadcn primitives (owned) + Figma tokens                                | Accepted |
| [0013](0013-reference-vertical-slice.md)                  | Reference slice: Creator Interview → ProfileGen                         | Accepted |
| [0014](0014-agentic-context-model.md)                     | Agentic context model (CLAUDE.md + ADRs + recipes + hooks + MCP)        | Accepted |
| [0015](0015-architecture-diagram-living-documentation.md) | Architecture diagram as living documentation                            | Accepted |

## Writing a new ADR

Copy [0000-template.md](0000-template.md), give it the next number, fill it in,
and add a row above. Don't edit an Accepted ADR's decision after the fact — write a
new one that supersedes it and mark the old one `Superseded by ADR-NNNN`.
