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
├── testing/               @resonance/ai/testing — fake models, fake foundation generators, fake embedder (DI only, never shipped)
├── creator-onboarding/    snapshot-v1.ts (the staged-interview behaviour) + snapshot-v1.copy.ts (its prose/labels/options)
│                          + service.ts (the open/transition use case over behaviour, store and generator)
└── agents/
    ├── creator-interview/ prompt.ts + creator-interview.agent.ts (Sonnet, streaming, no tools)
    └── profile-gen/       prompt.ts + profile-gen.agent.ts (transcript → draft) +
                           creator-foundation.ts (structured answers → draft, same tool + tier) +
                           commit-profile.ts (persists the committed draft)
```

The legacy `creator-interview` agent, transcript-driven `profileGenAgent` and
`commitCreatorProfile` are superseded by the staged runtime below and are no longer used by
`apps/web`; they remain only for the verify-live checks until cleanup seed `resonance-37cb`.

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
// Staged creator onboarding (ADR-0022) — contract types come from @resonance/core.
export { snapshotV1CreatorOnboardingBehavior }; // implements CreatorOnboardingBehavior
export {
  generateCreatorFoundation, // (request, deps?: { model }) => Promise<FoundationGenerationResult>
  creatorFoundationAgent,
  type FoundationGenerator,
  type GenerateCreatorFoundationDeps,
};
export { UnsupportedBehaviorVersionError, CreatorOnboardingStateError };
export {
  createCreatorOnboardingService, // ({ behavior, store, generateFoundation, newSessionId })
  type CreatorOnboardingService, // open(actor) · transition(actor, command) → CreatorOnboardingView
  type CreatorOnboardingServiceDeps,
  type CreatorOnboardingView,
  type CreatorOnboardingNotice,
};
```

## Staged creator onboarding (ADR-0022)

- **`snapshotV1CreatorOnboardingBehavior`** — the pure stage machine behind `@resonance/core`'s
  `CreatorOnboardingBehavior`. No I/O, no model call, never reads `@resonance/weave-os`. Copy is
  transcribed from design screens 14–23 and 06 into `snapshot-v1.copy.ts`. Semantics a caller
  relies on: only `offering` and `intended_experience` are required (they offer no Skip); the
  opening's `later` keeps the session at the opening with the opening slot `skipped`; the
  summary's `submit` (empty or not) and `skip` both return `generate`, and when the summary already
  holds a note (a retry after a failed generation) an empty submit or Skip keeps that note rather
  than replacing it with a skip; a `submit` with no (or
  whitespace-only) text on an optional text stage records the slot `skipped` and advances, while
  a required stage rejects it as `required_input_missing`; `request_help` on the name
  stage records `{ choiceId: "help_wanted", customText? }`; `choose_for_me` records
  `{ choiceId: "weave_chooses" }`; `acceptFoundation` works only from `summary` (any other stage
  is `unsupported_action`).
  A session pinned to another version **throws** `UnsupportedBehaviorVersionError` from every
  method; a foundation-stage session with no draft throws `CreatorOnboardingStateError`.
- **`generateCreatorFoundation(request, deps?)`** — structured answers (each paired with its
  question) through `runAgentStructured` on the ProfileGen tier and `proposeProfile` tool.
  Throws `ValidationError` (from core) for a malformed request and `AgentError` for any model
  failure or output that does not parse as `FoundationGenerationResult`. Logs nothing.
- **`createCreatorOnboardingService(deps)`** — the use case over both seams, so no Next.js code
  sequences a transition. `open` resumes the creator's session or starts and saves one.
  `transition` applies one command and runs whatever it asks for: `advanced` → save; `generate`
  → save the triggering answer first, call the generator, `acceptFoundation`, save again;
  `commit` → `store.complete` with the command's idempotency key. It returns a
  `CreatorOnboardingView` (`status`, `render`, `revision`, `committedProfile`, `notice`). A lost
  save race surfaces as `notice: "stale_revision"` with the winning state, a model failure
  (`AgentError`) as `"generation_failed"` with the answer kept, and a replayed commit as
  `"already_completed"`; any other generator error propagates. An optional `onGenerationFailed`
  dep receives a `GenerationFailureReport` (session id, revision, the `AgentError`'s name and
  message, and the cause's name/message/status — never an answer) for every `generation_failed`,
  so a revoked key or a provider outage is visible to the operator; `apps/web` wires it to
  `console.error`.
- **Test helpers** (`@resonance/ai/testing`): `FAKE_CREATOR_FOUNDATION_DRAFT`,
  `createFakeFoundationGenerator(draft?)`, `createFailingFoundationGenerator()`, and
  `createFakeFoundationModel(output?)` (a model whose forced tool call returns `output`).

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

`createFakeOnboardingModel()` (the legacy interview + ProfileGen model), the foundation fakes
above, and `createFakeEmbedder()` (deterministic 1024-dim embedder) live behind the `@resonance/ai/testing` subpath export — injected
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
