# ADR-0013: Reference vertical slice — Creator Interview → ProfileGen

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

The near-term deliverable is a scaffold plus **one** flow built end-to-end to prove
every pattern, so future flows can be built by replication. We need to pick the flow
that exercises the most layers, is central to the product, and avoids the deferred
media-storage dependency (ADR-0007).

## Decision

The reference slice is **Creator Onboarding Interview → ProfileGen**:

- The literal front door ("What brought you here today?").
- Exercises **auth** (Better Auth magic-link), **db** (Drizzle: users,
  creator_profiles, embeddings), **ai** (Weave interview agent + ProfileGen agent
  with a `saveProfile` tool — proving the agent/tool registry), **ui** (streaming
  Weave rail + profile panels from Figma), **Server Actions + Zod**, and the **full
  test pyramid**.
- **Seeds the pgvector matching backbone** by embedding the generated profile
  (ADR-0010), proving "resonance" matching end-to-end before there's a corpus.
- **Text-only** — no media-storage dependency.

## Consequences

- One slice validates auth + db + ai + ui + matching + tests together.
- Other flows (member onboarding, discovery search, feed) build on the same patterns
  in later sessions; discovery search specifically needs creator content first.

## Alternatives considered

- **Member onboarding → recommendations:** needs creator content to exist; less of the
  generation/agent pattern.
- **Conversational discovery search:** needs a populated catalog first — better as slice two.
- **Post feed:** least AI-centric; weak for proving the AI-first patterns.
