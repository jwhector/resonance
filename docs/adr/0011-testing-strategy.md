# ADR-0011: Testing strategy — Vitest + RTL + Playwright

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

This repo is meant to model good engineering discipline so agents replicate it. The
reference slice should be tested at every layer, establishing the pattern future
flows copy.

## Decision

- **Vitest** for unit/integration tests, co-located as `*.test.ts` next to source.
- **React Testing Library** for component tests (`*.test.tsx`).
- **Playwright** for end-to-end flows, in `apps/web/e2e`.
- New behavior ships with tests; bug fixes start with a failing test.

## Consequences

- Full testing pyramid from day one; CI gates on it (ADR-0014).
- The Creator Interview → ProfileGen slice is tested unit → component → E2E, giving
  agents a concrete template at each layer.
- Slightly more setup than unit-only, accepted for the discipline it enforces.

## Alternatives considered

- **Vitest + RTL only (defer E2E):** lighter, but no proven end-to-end pattern.
- **Minimal tests:** fastest, but undercuts the discipline the project models.
