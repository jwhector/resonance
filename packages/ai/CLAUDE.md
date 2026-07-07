# @resonance/ai

The home of everything AI (ADR-0009): the Vercel AI Gateway client, the **typed agent +
tool registry**, the shared streaming runner, embeddings (matching, ADR-0010), and the
concrete agents (Weave interview, ProfileGen — CoverGen and search land in later slices).

## The pattern (this is the important part)

Every AI feature is an `AgentDefinition`: `id`, `model` (a Gateway `provider/model`
string), system prompt, declared `tools` (each with a Zod input schema + handler), and
an optional output schema. They all run through **one shared runner** — never a
hand-rolled streaming/tool loop. Add new ones with the `add-ai-agent` recipe.

Model routing default: Haiku (cheap classification) · Sonnet (chat/interview) · Opus
(heavy generation) · Voyage (embeddings). All via the Gateway — no direct provider SDK.

## Status: REAL

The Gateway client, shared runner, embeddings, and the `creator-interview` + `profile-gen`
agents landed with Increment 2 of the reference slice (ADR-0013). Built fully wired for live
AI Gateway / Voyage but verified mock-first, so CI is green with zero credentials.

```
src/
├── registry.ts            AgentDefinition / AgentTool / defineAgent (the registry shape)
├── errors.ts              AgentError (typed runner failure)
├── gateway.ts             resolveModel() — Gateway string / fake / injected model (swap seam)
├── embeddings.ts          Embedder: resolveEmbedder / createLiveEmbedder / createFakeEmbedder
├── runner.ts              runAgentStream (streaming) + runAgentStructured (tool-driven)
└── agents/
    ├── creator-interview/ prompt.ts + creator-interview.agent.ts (Sonnet, streaming, no tools)
    └── profile-gen/       prompt.ts + profile-gen.schema.ts + profile-gen.agent.ts
```

## Public API

Import only from `"@resonance/ai"` — never reach into `src/` internals.

```ts
// Registry shape
export { type ModelId, type AgentTool, type AgentDefinition, defineAgent };
// Typed failure
export { AgentError };
// Model seam (ADR-0009)
export { resolveModel };
// The one runner — streaming + structured (tool-driven) paths
export { runAgentStream, runAgentStructured, type RunInput };
// Embeddings seam (ADR-0010)
export {
  type Embedder,
  type EmbeddableProfile,
  resolveEmbedder,
  createLiveEmbedder,
  createFakeEmbedder,
  profileToContent,
  EMBEDDING_MODEL, // "voyage-3.5"
  EMBEDDING_DIMS, // 1024 — pins the vector column in @resonance/db
};
// Concrete agents
export { creatorInterviewAgent, CREATOR_INTERVIEW_MODEL, CREATOR_INTERVIEW_SYSTEM };
export { defineProfileGenAgent, PROFILE_GEN_MODEL, type ProfileGenContext, type SaveProfileResult };
export { ProfileGenSchema, type GeneratedProfile };
```

## Three swap seams (design for testability)

Each seam hides a live service **and** a fake, chosen at runtime — this is what lets E2E run
the whole flow deterministically with no credentials (design spec § Mock-first runtime seam):

- **`resolveModel(modelId, opts?)`** — live: the AI SDK v6 global provider routes the
  `provider/model` string through the Gateway (`AI_GATEWAY_API_KEY`). `RESONANCE_FAKES=1`: a
  canned text model. `opts.model`: a caller-injected model (unit tests pass `MockLanguageModelV3`).
- **`resolveEmbedder()`** — live Voyage `voyage-3.5` (1024-dim) via the Gateway;
  `RESONANCE_FAKES=1` → a deterministic fake. Both assert the 1024-dim contract (ADR-0010).
- **`runAgentStream` / `runAgentStructured`** — the one runner. Streaming for the interview;
  structured (forced single tool call, executed, Zod-validated) for ProfileGen. Throws
  `AgentError` at the boundary — never swallows.

## The context-injection pattern (`defineProfileGenAgent`)

`saveProfile` needs the authenticated `userId`, the user's current roles, and `db` / `embedder`
handles — none model-supplied. `defineProfileGenAgent({ userId, currentRoles, db, embedder })`
returns an `AgentDefinition` whose tool handler closes over that server context. The registry
`handler: (input) => Promise<…>` type stays untouched. This is the canonical pattern for any
context-dependent tool. Its handler is what proves the registry (ADR-0013): write the profile
row → flip the user into a creator (`setUserRoles`) → embed → write the embedding row.

## Durable workflows — deferred

No durable workflow layer yet (interview is interactive; generators are short). Add Vercel WDK
only when ADR-0009's "When to revisit" triggers appear (long/expensive multi-step jobs — likely
combined storefront generation, or bulk re-embedding). Don't let that decision get lost.

## Rules

- Orchestration stays server-side (Server Actions / route handlers).
- Depends on `@resonance/core` and `@resonance/db` (embeddings + the `saveProfile` tool's writes).
- Tool handlers reach the DB/domains through their packages, never directly (`saveProfile` uses
  `@resonance/db`'s query helpers).
- `ai/test` (`MockLanguageModelV3`) is used only for the fake model + unit-test mocks; this is a
  server-only package, never shipped to the client.

## Working here (seeds + mulch)

Work in this package is tracked by an `ai`-labelled seed — `sd ready` / `sd search ai` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`ai`** mulch domain: `ml record ai --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
