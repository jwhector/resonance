# ADR-0008: RSC + Server Actions; TanStack Query where interactive

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

Most of Resonance can be server-rendered, but some surfaces are genuinely
interactive: the infinite Post feed, optimistic likes/replies, live search.

## Decision

- **React Server Components by default** for data loading.
- **Server Actions** for mutations, validated with Zod, returning typed results.
- **TanStack Query only where client interactivity demands it** (infinite feed,
  optimistic updates) — not as the default data layer.

## Consequences

- Logic and secrets stay server-side; minimal client JavaScript and client state.
- Clear, consistent default (RSC) with a sanctioned escape hatch (TanStack Query) so
  agents don't reach for a client cache reflexively.
- Some features will mix both; the boundary is "does the user interact with it live?"

## Alternatives considered

- **RSC + Server Actions only:** simplest, but optimistic UI / infinite scroll get awkward.
- **Client-heavy (TanStack Query everywhere):** familiar, but discards RSC/streaming benefits.
