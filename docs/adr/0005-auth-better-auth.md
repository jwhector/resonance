# ADR-0005: Better Auth (self-hosted magic-link)

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

The design uses email magic-link + verification code. We value owning identity
(no per-MAU cost, all logic in-repo for agents to read) and a modern, TypeScript-native
DX consistent with the rest of the stack.

## Decision

Use **Better Auth** in `@resonance/auth`, with the magic-link plugin, persisting its
tables in our own Neon Postgres via Drizzle. Email delivery goes through Resend
(ADR aligns with the email choice). Identity is fully self-hosted.

## Consequences

- No external identity vendor, no per-user pricing; all auth logic is in-repo.
- We own session/security concerns — mitigated by Better Auth's maintained
  primitives and the plugin model (org/2FA available later without re-platforming).
- Auth tables live alongside domain tables in the same database.

## Alternatives considered

- **Auth.js (NextAuth v5):** battle-tested but historically rougher DX/typing.
- **Clerk:** fastest to wire, but hosted, per-MAU, and identity lives off-platform —
  cuts against the ownership goal.
