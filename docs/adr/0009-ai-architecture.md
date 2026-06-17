# ADR-0009: AI SDK v6 via Gateway, typed agent registry; durable workflows deferred

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

AI is the heart of Resonance: the Weave interview, ProfileGen, CoverGen, OfferingGen,
and conversational discovery search. We need streaming, tool-calling, model
flexibility, cost control, and — crucially — a _consistent pattern_ that future
features (and agents building them) replicate rather than reinvent.

## Decision

1. **Substrate: Vercel AI SDK v6** — streaming, tool-calling, structured output.
2. **Model access: Vercel AI Gateway**, called with plain `"provider/model"` strings.
   BYOK (no markup), unified observability, instant fallback, per-task model swaps
   with no code change. **Default to Claude**: Haiku for cheap classification,
   Sonnet for chat/interview, Opus for heavy generation; Voyage for embeddings.
3. **Orchestration: a typed agent + tool registry** in `@resonance/ai`. Each AI
   feature is a definition — `id`, system prompt, declared tools (each with a Zod
   input schema), output schema, model — run through one shared runner that handles
   streaming, tool execution, and errors. No hand-rolled loops.
4. **Durable workflows: deferred.** The interview is interactive streaming chat and
   the generators are short; they don't need crash-safe resumption yet.

## Consequences

- Every AI feature looks the same → trivial to replicate (the `add-ai-agent` recipe).
- Cost is driven by _which model handles which task_, made easy by the gateway.
- No durability today; long/expensive multi-step jobs will need it later (see below).

## When to revisit (add Vercel Workflow / WDK)

Add a durable workflow layer when **any** of these appears — do not let this decision
get lost:

1. A job runs longer than you want a user to wait synchronously, or beyond a function
   timeout. **Likely first case: a combined "generate my whole storefront" flow**
   (profile + cover _image_ + offerings + embeddings) — image gen latency makes this
   minutes long.
2. Re-running the whole job on failure is expensive/wrong (you want resume-from-step
   so completed LLM/image calls aren't repeated and re-billed).
3. The work is genuinely background/async — e.g. **bulk re-embedding** all content
   after changing embedding models; batch order processing; scheduled digests.
4. You need per-step retries with backoff, or a human-in-the-loop pause (generate →
   await creator approval → publish).
5. Fan-out/fan-in (generate N cover variations in parallel, then pick the best).

**Smell test:** you're adding a `job_status` column and polling it, reaching for a
`setTimeout`/cron hack to "continue later," or seeing duplicate charges on retry.
First likely candidates for Resonance: combined storefront generation, and bulk
re-embedding.

## Alternatives considered

- **Explicit multi-model routing now:** same gateway/prices, more upfront config;
  deferred — default-Claude with easy per-task swaps is enough to start.
- **Direct provider SDK (no gateway):** loses failover/observability/easy routing.
- **Minimal single-call helpers:** fastest, but no shared pattern → drift.
- **Vercel Workflow now:** premature machinery the first slice wouldn't exercise.
