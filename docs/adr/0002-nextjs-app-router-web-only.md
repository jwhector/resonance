# ADR-0002: Next.js App Router; web-only, extraction-ready logic

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

The product is AI-heavy: the Weave interview, the generators, and conversational
search all benefit from streaming and server-side orchestration. We target Vercel.
We want web now, but want to keep the door open for a future mobile/native client.

## Decision

Build the web client with **Next.js App Router** (React Server Components, Server
Actions, streaming). Keep **all business logic in framework-agnostic `packages/*`**;
`apps/web` is a thin shell that imports and renders them. No domain logic in the app.

## Consequences

- Streaming AI responses, server-side secrets, and Vercel-native deploys come for free.
- Discipline required: logic must not leak into the app layer. Enforced by convention
  - review; the recipes scaffold packages, not app-embedded logic.
- A future Expo/native client could depend on the same `packages/*`.

## Alternatives considered

- **Vite SPA + separate API:** cleaner client/server split, but we'd hand-build
  streaming, sessions, and deploy plumbing.
- **Remix / React Router 7:** solid, but smaller AI-streaming ecosystem and less
  Vercel-native than Next.js.
