# @resonance/ai

The home of everything AI (ADR-0009): the Vercel AI Gateway client, the \*\*typed agent

- tool registry\*\*, the shared streaming runner, embeddings (matching, ADR-0010), and
  the concrete agents (Weave interview, ProfileGen, CoverGen, search).

## The pattern (this is the important part)

Every AI feature is an `AgentDefinition`: `id`, `model` (a Gateway `provider/model`
string), system prompt, declared `tools` (each with a Zod input schema + handler), and
an optional output schema. They all run through **one shared runner** — never a
hand-rolled streaming/tool loop. Add new ones with the `add-ai-agent` recipe.

Model routing default: Haiku (cheap classification) · Sonnet (chat/interview) · Opus
(heavy generation) · Voyage (embeddings). All via the Gateway — no direct provider SDK.

## Status: SKELETON

`registry.ts` defines the shape (`AgentDefinition`, `AgentTool`, `defineAgent`). The
runner, Gateway client, embeddings helper, and the `creator-interview` + `profile-gen`
agents land in the reference slice (ADR-0013). Planned layout:

```
src/
├── registry.ts           Agent/tool types (done)
├── runner.ts             Shared streaming + tool-execution runner
├── gateway.ts            AI Gateway client (provider/model strings)
├── embeddings.ts         Voyage embeddings → pgvector (via @resonance/db)
└── agents/<id>/          prompt.ts + <id>.agent.ts per agent
```

## Durable workflows — deferred

No durable workflow layer yet (interview is interactive; generators are short). Add
Vercel WDK only when ADR-0009's "When to revisit" triggers appear (long/expensive
multi-step jobs — likely combined storefront generation, or bulk re-embedding). Don't
let that decision get lost.

## Rules

- Orchestration stays server-side (Server Actions / route handlers).
- Depends on `@resonance/core` and (for embeddings) `@resonance/db`.
- Tool handlers reach the DB/domains through their packages, never directly.

## Working here (seeds + mulch)

Work in this package is tracked by a `ai`-labelled seed — `sd ready` / `sd search ai` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`ai`** mulch domain: `ml record ai --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
