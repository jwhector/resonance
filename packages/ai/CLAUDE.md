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
agents landed with Increment 2 of the reference slice (ADR-0013). The seams are **live by
default** (ADR-0018): shipped code always resolves a real provider (Gateway, or a direct
Anthropic/Voyage fallback) and fails closed with no key. Fakes are injected in tests via DI
from the `@resonance/ai/testing` subpath — never chosen by a runtime flag.

```
src/
├── registry.ts            AgentDefinition / AgentTool / defineAgent (the registry shape)
├── errors.ts              AgentError (typed runner failure)
├── provider-config.ts     selectProvider (internal: shared Gateway→direct→fail-closed ladder) + assertAiConfigured (exported fail-fast gate)
├── gateway.ts             resolveModel() — live: Gateway string OR direct @ai-sdk/anthropic; injected model in tests
├── embeddings.ts          Embedder: resolveEmbedder — live Gateway OR direct voyage-ai-provider
├── runner.ts              runAgentStream (streaming) + runAgentStructured (tool-driven)
├── test/                  @resonance/ai/testing — createFakeModel + createFakeEmbedder (DI only, never shipped)
└── agents/
    ├── creator-interview/ prompt.ts + creator-interview.agent.ts (Sonnet, streaming, no tools)
    └── profile-gen/       prompt.ts + profile-gen.agent.ts (generates a draft) +
                           commit-profile.ts (persists the committed draft)
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
// Fail-fast config gate (ADR-0018) — assert model AND embedding providers are jointly resolvable
// from env before onboarding starts (env-presence only; no live call). Call at onboarding entry.
export { assertAiConfigured };
// The one runner — streaming + structured (tool-driven) paths
export { runAgentStream, runAgentStructured, type RunInput };
// Embeddings seam (ADR-0010) — live by default; fakes live in @resonance/ai/testing
export {
  type Embedder,
  type EmbeddableProfile,
  resolveEmbedder,
  profileToContent,
  EMBEDDING_MODEL, // "voyage-3.5"
  EMBEDDING_DIMS, // 1024 — pins the vector column in @resonance/db
};
// Concrete agents
export { creatorInterviewAgent, CREATOR_INTERVIEW_MODEL, CREATOR_INTERVIEW_SYSTEM };
// ProfileGen: generation returns an editable draft (writes nothing);
// commitCreatorProfile is the explicit "put on profile" step (persists + embeds + role flip).
export { profileGenAgent, PROFILE_GEN_MODEL };
export { commitCreatorProfile, type CommitProfileContext, type CommitProfileResult };
```

The generated/committed shapes are the **shared `@resonance/core` contract** —
`CreatorProfileDraft` (generation output) and `CommitProfileInput` (commit payload). Import
those from `@resonance/core`, not here (`ai` is server-only and must never ship to the client;
the draft is also spoken by `ui`/`web`, so it lives in `core` — ADR-0003).

## Seams: live by default, fakes injected in tests (ADR-0018)

Each seam resolves a **real provider** in shipped code — there is no `RESONANCE_FAKES` runtime
branch. Selection is by key precedence, and with no key the seam **fails closed** with an
actionable `AgentError` (never silently fakes or no-ops). Tests pass a fake in via DI (from
`@resonance/ai/testing`), so the fast inner loop stays deterministic and credential-free while the
runtime path can't drift from the live contract.

Both live seams route through **one internal ladder** — `selectProvider` in `provider-config.ts`
(Gateway → direct provider → fail-closed `AgentError`) — so the precedence rule lives once and the
two seams can't drift. `selectProvider` is internal (not on the `@resonance/ai` entrypoint).

- **`resolveModel(modelId, opts?)`** — `opts.model` (DI, wins) → Vercel AI Gateway when
  `AI_GATEWAY_API_KEY` is set (the AI SDK v6 global provider routes the `provider/model` string)
  → direct `@ai-sdk/anthropic` when `ANTHROPIC_API_KEY` is set (serves `anthropic/*` ids) → else
  throws. Unit tests inject a `MockLanguageModelV3` via `opts.model`.
- **`resolveEmbedder()`** — Voyage `voyage-3.5` (1024-dim, ADR-0010) via the Gateway when
  `AI_GATEWAY_API_KEY` is set → direct `voyage-ai-provider` when `VOYAGE_API_KEY` is set → else
  throws. Tests inject `createFakeEmbedder()` (from `@resonance/ai/testing`) through the `Embedder`
  DI seam (e.g. `commitCreatorProfile`'s `ctx.embedder`).
- **`runAgentStream` / `runAgentStructured`** — the one runner. Streaming for the interview;
  structured (forced single tool call, executed, Zod-validated) for ProfileGen generation. Throws
  `AgentError` at the boundary — never swallows.
- **`assertAiConfigured()`** — fail-fast boot-time gate. Checks env **presence only** (no live
  call) that the model AND embedding providers are **jointly** resolvable — `AI_GATEWAY_API_KEY`,
  OR both `ANTHROPIC_API_KEY` and `VOYAGE_API_KEY` — mirroring `scripts/verify-live.mjs`'s joint
  gate. Throws one `AgentError` naming exactly what's missing. Call it once at each onboarding
  entry point (before the interview / profile generation) so a partial config (e.g. Anthropic
  without Voyage) fails up front instead of at the profile-commit `resolveEmbedder` step.

## Test-only fakes: `@resonance/ai/testing`

`createFakeModel(modelId)` (deterministic text-only language model) and `createFakeEmbedder()`
(deterministic 1024-dim embedder) live behind the `@resonance/ai/testing` subpath export — injected
into `RunInput.model` / an `Embedder` DI seam by unit tests. They are **never** imported by
shipped runtime code and are not on the main `@resonance/ai` entrypoint (ADR-0018).

## ProfileGen: generate a draft, then commit it (two steps)

The Creator Onboarding UX generates a profile **draft**, lets the user edit it and pick a name,
then commits it. The two halves are deliberately split so nothing is written until the user says so:

- **Generation — `profileGenAgent`** is a plain agent (like `creator-interview`, no server
  context). Its single `proposeProfile` tool has `inputSchema = CreatorProfileDraftSchema` and a
  **pure** handler that just returns the validated `CreatorProfileDraft` — up to three candidate
  names plus headline, bio, tags. Run it through `runAgentStructured` (forced single tool call);
  the tool's return value is the agent's output. **It touches no db/embedder and writes nothing.**
- **Commit — `commitCreatorProfile(ctx, input)`** is a plain exported async function (NOT an agent
  tool). The web layer calls it after the user edits the draft and picks a name.
  `ctx: { userId, currentRoles, db, embedder }`, `input: CommitProfileInput` (Zod-validated at the
  boundary). It is what proves the registry's ai→db→matching path (ADR-0013) and preserves the
  **no-interactive-transaction ordering** (ADR-0004): embed first (external, fail-safe) →
  `createCreatorProfile` (`offerings: []`, `status: "ready"`) → `upsertProfileEmbedding` →
  `setUserRoles([...currentRoles, "creator"])` **last** (additive, so member→creator preserves
  membership). Returns `{ profileId }`.

## Durable workflows — deferred

No durable workflow layer yet (interview is interactive; generators are short). Add Vercel WDK
only when ADR-0009's "When to revisit" triggers appear (long/expensive multi-step jobs — likely
combined storefront generation, or bulk re-embedding). Don't let that decision get lost.

## Rules

- Orchestration stays server-side (Server Actions / route handlers).
- Depends on `@resonance/core` and `@resonance/db` (embeddings + `commitCreatorProfile`'s writes).
- DB access goes through `@resonance/db` query helpers, never directly — `commitCreatorProfile`
  uses `createCreatorProfile` / `upsertProfileEmbedding` / `setUserRoles` (ADR-0009).
- The Vercel SDK's `ai/test` (`MockLanguageModelV3`) backs the fakes in `@resonance/ai/testing`; both
  are test-only. This is a server-only package, never shipped to the client, and the fakes are
  never imported by shipped runtime code (ADR-0018).

## Working here (seeds + mulch)

Work in this package is tracked by an `ai`-labelled seed — `sd ready` / `sd search ai` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`ai`** mulch domain: `ml record ai --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
