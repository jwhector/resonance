# ADR-0023: Weave runtime — the designer's orchestrated stage workflow, executed over the compiled corpus

- **Status:** Proposed — written 2026-09-22 for review. The decisions below were agreed on
  2026-09-21/22; the three questions ADR-0022 reopens are listed under _Open questions_ and are
  the only parts not yet settled.
- **Date:** 2026-09-22
- **Reverses:** ADR-0020 § 2 ("machinery typed but deliberately not executed").
- **Supersedes in part:** ADR-0022 §§ 1, 3, 4, 9 and 12; answers the fork its _Revisit when_ left
  open. Its product properties (§§ 2, 5–8, 10, 11) stand — see § 6.
- **Amends:** ADR-0020 and ADR-0022 (notes added there).

## Context

### The designer's runtime architecture is in Figma, and it is newer than the documents

ADR-0020 ratified Weave OS from five July documents and built `@resonance/weave-os`: the corpus,
compiled at build, behind `resolveWeaveOs`. It typed the flow machinery — stages, captures,
actions, branches, session state — and deliberately did not execute it, because the interview at
the time was a free-form chat and executing the machinery "would be an interview rebuild, not a
foundation". The package was then deferred on 2026-07-28 with 25 source defects logged in
`packages/weave-os/DEFECTS.md`.

On 2026-09-21 the designer's most recent work was found somewhere else entirely: the page **Weave
OS Architecture** (node `2580:57143`) of the Figma file "Resonance 9-21-26" (key
`xXo4CDHx0PxbgEPuyPJx4Z`). It is a **runtime** design, not a document: a stage machine drawn as
Python modules with per-step input/output contracts, a four-database data layer, and a
**DataContract Library** (node `3029:13977`) of field-level shapes written as Python type hints.
Row 1 of the page — InterviewTrigger `3278:20869`, ConversationGeneration `3274:24493`,
ContinuousConversationGeneration `3284:40253`, ChatTrigger `3280:38667`, ContinuousChat
`3284:40094`, StageRendering `3278:21887` — was declared complete design on 2026-09-21. None of its
vocabulary appears in the five July documents. Only its "WeaveOS definitions" box maps onto what
`@resonance/weave-os` holds.

The shape it draws, in the designer's names (a gloss follows each on first use):

| Figma module                                                                                                                   | Responsibility, as drawn                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **InteractionRouter**                                                                                                          | Reads an `interaction_request` from the Frontend and routes it to a structured flow or to chat (`route_target`).                                                                                                                                                                                                                                                                                                                                              |
| **SessionManager** / **SessionStore** / **SessionCoordinator**                                                                 | Creates, loads and checkpoints the session; persists `weave_context`, the full per-session record, with a `SessionReference` index entry.                                                                                                                                                                                                                                                                                                                     |
| **Stage.py** — `StageExecutor`, `StageUpdater`, `DataExtractor`, `StageEvaluator`                                              | The stage machine. The executor reads the current stage and issues the requests it needs; the updater folds each result (conversation, capability, creator interaction) into `stage_state`; the extractor pulls structured `extracted_data` out of a creator's input against the stage's `data_target`; the evaluator decides render readiness, session-store readiness and the `stage_decision` (next stage, follow-up, or a capability such as completion). |
| **DefinitionLoader** — `DefinitionResolver`, `DefinitionCoordinator`                                                           | Answers a `definition_request` with a versioned `definition_result` (and a `follow_up_definition`).                                                                                                                                                                                                                                                                                                                                                           |
| **WeaveContextUpdater** — `ConversationContextResolver`, `CreatorContextResolver`, `WeavePresenceResolver`, `ContextAssembler` | Resolves the three context sources — the conversation so far, what is known about the creator (from the FrequencyDatabase, with `CoherenceResolver` when relevant), and Weave's own presence (how Weave should be present, queried from the Weave OS definitions) — and assembles them into `weave_context`.                                                                                                                                                  |
| **ConversationRuntime**                                                                                                        | Builds the model-ready request for the current Weave turn from `weave_context`.                                                                                                                                                                                                                                                                                                                                                                               |
| **ModelProvider** (→ Claude)                                                                                                   | Translates a provider-neutral request into the selected provider's call: `prompt_request → raw_prompt`, `profile_generation_request → raw_profile_generation`, `session_title_generation_request → session_title`.                                                                                                                                                                                                                                            |
| **ConversationResultHandler**                                                                                                  | Normalises, validates and packages the raw model response into a `conversation_result`.                                                                                                                                                                                                                                                                                                                                                                       |
| **InterfaceRenderer** → **Frontend**                                                                                           | Prepares the `render_payload` the Frontend draws; the Frontend returns an `interaction_result` (`user_input`, `action_input`, `selected_option`).                                                                                                                                                                                                                                                                                                             |
| **Capabilities.py** — `CapabilityRegistry`, `CapabilityCoordinator`, `CapabilityErrorHandler`                                  | Routes a `capability_request` by `capability_id` to a capability (ProfileGeneration, ImageGeneration, ReviseWithWeave, Completion, Paused, …) and returns a `capability_result`; an error resolves to `retry` (one attempt), `fallback` or `fail`.                                                                                                                                                                                                            |
| **Generation.py** — `GenerationContextResolver`, `GenerationCoordinator`, `GenerationValidator`, `GenerationResultHandler`     | Profile generation as a capability: select only confirmed creator context, build the request, validate the model output against the `generation_definition`, run another cycle on an invalid result.                                                                                                                                                                                                                                                          |
| **Completion.py** — `CompletionCoordinator`, `SessionLifecycleUpdater`, `NextExperienceResolver`, **DataGate**                 | On completion and on pause: mark the session, run the **DataGate** — "determine what should be persisted and what should be recorded as signal", through five questions — and resolve the next experience (the Figma's answer: `weave_quick_chat`).                                                                                                                                                                                                           |
| **Chat.py** — `ChatExecutor`, `ChatUpdater`, `DataExtractor`, `ChatEvaluator`                                                  | The same machine for open conversation, step for step.                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Data layer** — FrequencyDatabase, CreatorDatabase, EvaluationMetricsDatabase, RelationshipDatabase                           | Persistent structured understanding of the creator across experiences (ten dimensions); the published profile; interaction signals (ten dimensions); relationships.                                                                                                                                                                                                                                                                                           |

Every one of these is labelled `.py` or `.sql`. **There is no Python service.** The labels are the
designer's notation for "a module with these inputs and outputs".

### The repo already has a staged runtime, and it is not this one

Between the July deferral and the September audit, ADR-0022 (2026-09-13) shipped a
**product-owned staged runtime**: eleven stages hand-modelled from the _Resonance 9/10/26_ snapshot
screens, behind two versioned seams in `@resonance/core` — `CreatorOnboardingBehavior` (a pure
stage machine: no I/O, no model call, no corpus read) and `CreatorOnboardingSessionStore` — with a
`snapshot-v1` behaviour in `@resonance/ai`, a one-row session store in `@resonance/db`, one
renderer in `@resonance/ui`, and a single Server Action. It is what `/onboarding/creator` runs
today.

ADR-0022 was explicit that it was not the Weave OS decision. It chose "hand-model the snapshot
stages now; do not consume the corpus", and left the **later Weave OS adapter** — "whether that
adapter consumes, retranscribes, or replaces `emerging_creator_onboarding.yaml`" — open until "the
MVP contract and its conformance tests exist", with _Revisit when the Weave OS adapter is
designed_ as its first trigger. That is this ADR.

The two runtimes describe the same interview. ADR-0022's stage ids are the corpus's stages under
shorter names, with two exceptions the designer has to rule on (the screens draw a pre-generation
`summary` the corpus does not define; the corpus defines `collaborative_refinement`, which the
screens defer):

| Corpus stage (`emerging_creator_onboarding.yaml`) | ADR-0022 `snapshot-v1` stage | Figma screen (9/10/26) |
| ------------------------------------------------- | ---------------------------- | ---------------------- |
| `opening`                                         | `opening`                    | `1473:81547`           |
| `creator_or_project_name`                         | `creator_name`               | `1473:81553`           |
| `what_they_want_to_share`                         | `offering`                   | `1473:81556`           |
| `origin`                                          | `origin`                     | `1473:81565`           |
| `intended_experience`                             | `intended_experience`        | `1473:81568`           |
| `resonance_moment`                                | `resonance_moment`           | `1473:81571`           |
| `resonant_people`                                 | `resonant_people`            | `1473:81574`           |
| `expression_style`                                | `expression_style`           | `1556:79716`           |
| — (not a corpus stage)                            | `summary`                    | `1485:48994`           |
| `foundation_generation`                           | `foundation`                 | `2065:58399`           |
| `collaborative_refinement`                        | — (deferred)                 | `2065:68958` …         |
| `completion`                                      | `completion`                 | `1443:78273`           |

What ADR-0022's seam cannot host is the thing the Figma runtime is about: **Weave's turn is
generated.** `StageExecutor` issues a turn request, `ModelProvider` answers it, `DataExtractor`
reads the creator's reply with a model, and `StageEvaluator` decides what happens next from what
was extracted. `CreatorOnboardingBehavior`'s invariant 8 ("no method performs I/O, calls a model,
or reads the Weave OS corpus") forbids all of it, by design. So the Figma runtime is not an adapter
behind that seam; it is the runtime the seam was reserving room for.

### What is in scope

This ADR decides the shape for **creator onboarding + profile generation** only:

- **In:** executing `corpus/active/emerging_creator_onboarding.yaml` (11 stages) through the
  Figma's stage runtime; generating the profile foundation to the flow's `foundation_generation`
  definition (three headline candidates of 50–100 characters, three About candidates of at most
  500, five to ten discovery tags, three name candidates when the creator wants support,
  `foundability_feedback`); completing onto the published profile; writing what the creator
  confirmed to the FrequencyDatabase through the DataGate; recording interaction signals.
- **Out:** the Chat.py runtime, image generation, ReviseWithWeave / `collaborative_refinement`
  (the foundation stage renders edit-directly only), Evolution Engine entities, VisualIdentityNote,
  RelationshipDatabase, CoherenceResolver per turn, the Sessions tab (session list, session titles),
  and any existing-creator interview (no stage definition exists anywhere).

## Decision

### 1. Source of truth: the Figma wins; Python labels mean TypeScript

Where the Figma page disagrees with `docs/Weave*.md`, `docs/Emerging*.md` or `DEFECTS.md`, the
Figma is the design. Every module it labels `.py` or `.sql` is TypeScript inside this monorepo.

Two things this ruling does **not** override. First, the corpus's _content_ — the philosophy,
principles, stage copy and output constraints ADR-0020 transcribed — is not restated in the Figma
and remains authoritative; the Figma describes how to execute it. Second, ADR-0022's **product**
properties (no transcript persisted, raw answers erased at commit, identity never client-supplied,
revision-checked writes, unavailable capabilities absent or honestly disabled) are September
product decisions, not July documents. Where the Figma's data model collides with one of them
(`weave_context.conversation_context.messages`, and the SessionStore frame's "Loading a Session"
scenario that re-renders the previous conversation), § 6 keeps the property and _Open questions_
records the collision.

### 2. Adopt the orchestrated-workflow shape, with the Figma's module names

The runtime is built as the Figma draws it: the modules in the table above, with their names,
their responsibilities and their step contracts. A request travels

```
Frontend → InteractionRouter → SessionManager (load weave_context / session_state)
        → StageExecutor ──▶ DefinitionLoader (definition_result, follow_up_definition)
                        ──▶ StageUpdater (fold the creator's interaction_result)
                        ──▶ DataExtractor (extracted_data against the stage's data_target)
                        ──▶ StageEvaluator (stage_decision: next_stage | follow_up | skip | capability)
                        ──▶ WeaveContextUpdater (conversation ctx → creator ctx → weave presence → weave_context)
                            → ConversationRuntime → ModelProvider → ConversationResultHandler
                            → StageUpdater (conversation_result)
                        ──▶ StageEvaluator (render_readiness_decision; session_store_decision)
        → InterfaceRenderer (render_payload) → Frontend
```

and, when the evaluator's decision is a capability (`capability_id: completion`,
`operation_id: complete`), through `CapabilityCoordinator → Completion.py` —
`SessionLifecycleUpdater` marks the session, `CompletionCoordinator` sends the session's
`weave_context` through the `DataGate`, `NextExperienceResolver` names what comes next — and back
to `StageUpdater` as a `capability_result`. Profile generation is the same path with
`capability_id: generation` and `Generation.py` behind it.

"Adopt" means three concrete things:

- **The names are the code's names.** `StageExecutor`, `StageEvaluator`, `DataGate`,
  `RenderPayload` and the rest are the identifiers in the runtime and in `@resonance/core`. A
  reader of the Figma can find every box; a reader of the code can find every frame.
- **The contracts are the Figma's contracts.** The DataContract Library's shapes are normalised
  once into one vocabulary — [`docs/weave-runtime-contracts.md`](../weave-runtime-contracts.md),
  one row per contract with fields, producer, consumer and Figma source — and typed as Zod schemas
  in `@resonance/core`. Field names stay the designer's `snake_case` in the contract document and
  become `camelCase` exactly once, at the TypeScript boundary. Where the Figma uses two names for
  one thing (`TurnRequest` / `ConversationRequest`, `prompt_request`, three spellings of the
  Frequency query result) that document records the one name chosen and why.
- **The step semantics are the Figma's.** The render-readiness gate runs before anything is
  rendered; the stage decision is made from `extracted_data`, `data_target`, `follow_up_policy`
  and `rules`; a capability error resolves to `retry` (one attempt), `fallback` or `fail`; the
  DataGate's five questions decide what persists and what becomes signal.

### 3. Eight deviations from the Figma, each with its reason

The Figma is a design of a runtime, not of a package layout or a cost model. Where the repo
departs from it, this section says so, so that "what we decided and how it differs from the Figma"
can be re-articulated at any time.

**(1) One runtime package, `@resonance/weave-runtime`, behind one seam.** The Figma's boxes become
**internal modules** of that package, not packages of their own, and its Utilities
(InteractionRouter, SessionManager, DefinitionLoader, InterfaceRenderer) are its entry and exit
adapters. The seam is small: an `interaction_request` in, a `render_payload` out, plus a streaming
variant for chat-type stages. _Reason:_ package boundaries are context boundaries (ADR-0003) and
the runtime is one context — a crewmate that changes `StageEvaluator` needs `StageExecutor` open;
a deep module hides a lot behind a little (ADR-0017), and a request-in/payload-out seam is exactly
that. The runtime depends on `@resonance/core` (contracts and ports) and `@resonance/weave-os`
(definitions) only; `ModelProvider`, the session store, the capabilities and the DataGate's targets
are **ports in `core`**, implemented by `@resonance/ai` and `@resonance/db` and injected from the
composition root, live by default (ADR-0018).

**(2) `ContextAssembler` produces a per-turn slice; the full `weave_context` is the persisted
record, not the prompt input.** The Figma routes `weave_context` into `ConversationRuntime` whole.
Here the stage's `TurnRequest` names what the turn may see (the Figma's own
`CapabilityRequest.context_refs` idea, applied to conversation turns), and the assembler returns
that slice: Weave's presence, the conversation context, and the groups of `creator_context` the
stage asks for. The full `weave_context` — identity, session, flow, creator context, conversation
context, capability context, revision context, assets, runtime — is what the session store
persists. _Reason:_ cost and privacy. The Figma's `CreatorContext` is a ~50-field tree; sending it
and the whole session on every turn multiplies tokens for no gain and puts the creator's every
answer into every prompt. Persisting it whole keeps the session resumable and the completion gate
complete.

**(3) The FrequencyDatabase is written at completion through the DataGate, not read per turn;
`CoherenceResolver` is behind a flag, off.** The Figma reads Frequency through
`CreatorContextResolver` on every turn (classifying with a `FrequencyDefinition`), runs
`CoherenceResolver` against it, and also runs the DataGate on **pause** (`operation_id: pause`,
trigger `session_paused`). This slice writes on completion only, reads nothing back, and does not
gate on pause (pause is a session checkpoint). _Reason:_ an emerging creator's first interview has
no history to be coherent with, and no second experience reads Frequency yet. Writing keeps the
data real so the next experience finds it; reading, coherence and pause-time gating become a flag
flip once something needs them.

**(4) Streaming is on inside chat-type stages; the readiness gate applies to the `RenderPayload`;
a per-`stage_type` flag in the definition lets the designer turn it off without code.** The
Figma's `StageEvaluator` decides `render_readiness_decision` before `InterfaceRenderer` builds
anything, which read literally forbids streaming Weave's words. Here the gate decides **whether** a
stage renders and with what envelope (actions, options, progress); inside an approved chat-type
envelope, Weave's text streams. _Reason:_ a chat stage whose reply arrives all at once feels dead,
and streaming _before_ the gate would leak un-gated content. Splitting envelope from text keeps
both properties. The flag lives in the definition so the designer can change the behaviour per
stage type with a YAML edit.

**(5) One runtime for structured flow and chat.** `ChatExecutor` is a `StageExecutor` running a
one-stage definition; `Chat.py` is not built in this slice, and `route_target` reserves `chat` as
an enum member so nothing has to be renamed later. _Reason:_ the Figma's Chat.py mirrors Stage.py
step for step (`ChatUpdater` ↔ `StageUpdater`, `ChatEvaluator` ↔ `StageEvaluator`); two runtimes
would fork the same machine.

**(6) Definitions stay compiled at build; `DefinitionRequest`/`DefinitionRef` sit on top with a
single version policy; the definition version is stamped into the session.** The Figma's
`DefinitionLoader` resolves a request (`definition_type`, `definition_id`, `version_policy`,
`version`, `variant`) to a `DefinitionRef` (`type`, `id`, `version`, `location`) and deserialises
a file. Here `DefinitionLoader` **is** `resolveWeaveOs` (ADR-0020 § 1: no runtime reads),
`version_policy` has one value (the compiled release), the `DefinitionRef` is derived from the flow
file's `version` plus the corpus `releaseId`, and `weave_context.session` records `definition_id`,
`definition_version` and the release — the Figma's own fields. _Reason:_ a malformed definition
must fail the build, not a request; and a session must be attributable to the definition that ran
it, which is ADR-0022 § 4's version-pinning principle carried over.

**(7) DataGate rules and the capture-to-Frequency mapping are authored by us as PROVISIONAL; the
designer approves.** The Figma poses the five questions (Confirmed by creator? Correct scope?
Eligible to persist? Permission/policy? Record as signal?), names a `FrequencyDefinition` that
classifies candidates into dimensions, and gives a partial mapping on the Database Related frame
(`3212:12294`); it writes no rules. _Reason:_ the runtime needs an answer to run at all; inventing
one silently would be the drift the corpus's provenance rules exist to prevent. The defaults are in
the designer's list, marked, and nothing ships as approved until he says so.

**(8) Evaluation vocabulary: `weave_observations.category` is reconciled to the Figma's ten
EvaluationMetricsDatabase dimensions; the sixteen scoring dimensions stay untouched.** The
observation record's three-value `category` (`creator` / `weave` / `relationship`) is replaced by
the Figma's ten — `completion`, `friction`, `alignment`, `principle_evaluation`,
`conversation_efficiency`, `output_quality`, `refinement_behavior`, `preference_learning`,
`question_effectiveness`, `pattern_discovery` — so the `InteractionSignalRecord` the runtime writes
and the observation table share one vocabulary. The nine process dimensions and seven principle
sub-scores in `weave-evaluation.ts` are not touched. _Reason:_ nothing has written an observation
yet, so the table is empty and the enum is free to change; the scoring tables are the Evolution
Engine's input and it is not designed (ADR-0020).

### 4. The nine blanks in the Figma, and the default chosen for each

These block the slice until answered. Each has a default so the build can start; **PROVISIONAL**
means the designer has not approved it and the designer's list
([`docs/weave-runtime-designer-list.md`](../weave-runtime-designer-list.md)) asks him to.

| #   | Blank                                              | Default in force                                                                                                                                                                                                                                                                                                         | Status                                 |
| --- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| 1   | Definition file schema                             | The corpus YAML (`InterviewFlowFileSchema`) plus per-stage `stageType`, `followUpPolicy`, a completion rule and the streaming flag; `captures` = the Figma's `data_target`, `guardrails` = `rules`, `avoidLanguage` = `avoid`, `actions` = `actions`.                                                                    | Settled shape; field names PROVISIONAL |
| 2   | `StageEvaluator` completion rule per stage         | Advance when every capture the stage's rule names is filled; otherwise follow up, at most `followUpPolicy.maximum` times (1 where the flow says so, 0 elsewhere); then advance. The flow's `minimumInformation` gates generation, not stages.                                                                            | PROVISIONAL                            |
| 3   | `DataExtractor` spec                               | Claude Haiku, structured output against a Zod schema derived from the stage's captures; a failed or empty extraction never blocks — `extracted_data` is null and the evaluator's follow-up rule decides.                                                                                                                 | PROVISIONAL                            |
| 4   | Weave Presence source                              | The composed philosophy + principles `resolveWeaveOs` already returns as `system` — the "WeaveOS definition" the Figma's `WeavePresenceResolver` queries — the same for every stage.                                                                                                                                     | PROVISIONAL                            |
| 5   | Next experience after completion                   | The published profile page. The Figma's `NextExperienceResolver` returns `weave_quick_chat`; chat is out of scope, so the resolver exists with one experience.                                                                                                                                                           | PROVISIONAL deviation                  |
| 6   | Action labels (D-13) and six branch targets (D-07) | Labels: the creator-facing strings ADR-0022 transcribed from the 9/10/26 screens, mapped to the corpus's action ids; corpus actions with no screen stay unlabelled and are asked. Branch targets: PROVISIONAL definitions in the designer's list.                                                                        | PROVISIONAL                            |
| 7   | Generation definition                              | The flow's `foundation_generation` outputs as authored: 3 headline candidates (50–100 chars), 3 About candidates (≤ 500), 5–10 tags, 3 name candidates when `creator_name_status` is `wants_support`, `foundability_feedback`. `CreatorProfileDraftSchema` widens to carry candidates; the commit shape does not change. | Settled by the corpus                  |
| 8   | DataGate rules + FrequencyDefinition mapping       | Written by us as decision rules per question and a capture-to-dimension table seeded from the Database Related frame.                                                                                                                                                                                                    | PROVISIONAL                            |
| 9   | `collaborative_refinement` / ReviseWithWeave       | Deferred. The foundation stage renders edit-directly only; `revise_with_weave` is absent from the offered actions (ADR-0022 § 10's rule, kept).                                                                                                                                                                          | Settled for this slice                 |

### 5. What changes in ADR-0020

- **§ 2 is reversed.** The flow machinery `resolveWeaveOs` returns is executed, by
  `@resonance/weave-runtime`. The "tracked gap between spec and runtime" becomes a **conformance
  suite** the runtime must pass against the definition, not a permanent artefact.
- **§ 1 stands** (build-time compile; deviation 6 depends on it).
- **§ 3 stands** (git governance + CODEOWNERS); the new definition fields are corpus edits and go
  through the same tiers.
- **§ 4 stands** (registry split); the runtime does not touch pattern records.
- **§ 5 stands** (child-side inheritance).
- **§ 6 stands.** The runtime is **request-scoped**: one interaction in, one payload out, within an
  HTTP request. It does not touch the job-scoped executor boundary, and it adds no third entry
  point to `runner.ts` — `ModelProvider` is a port whose `@resonance/ai` adapter calls the existing
  `runAgentStream` / `runAgentStructured`.
- ADR-0020's premise that the five documents are the design input is superseded for anything the
  Figma restates.

### 6. What changes in ADR-0022

The "later Weave OS adapter" is this runtime, and it does not fit behind
`CreatorOnboardingBehavior`, so:

- **§ 1 (two seams) is superseded** by the `weave-runtime` seam for behaviour. The **store** side
  keeps its role and its guarantees — one owned row per creator, revision-checked `save`,
  one-statement idempotent `complete` — and its `state` becomes the persisted `weave_context`.
- **§ 3 (hand-model; do not consume) is reversed:** the runtime consumes the corpus definition. The
  fork ADR-0022 left open is answered: **consume**, with the definition-schema additions in § 4
  blank 1 — not retranscribe and not replace.
- **§ 4 (closed `behaviorVersion` enum) is superseded** by the definition pin of deviation 6. Its
  principle — a session written under one set of rules is never silently reinterpreted by another —
  is kept.
- **§ 9 (only two stages gate generation) is superseded** by reading the definition's
  `minimumInformation`, which names the same two captures today.
- **§ 12 (the service loop) is superseded** by the runtime's own orchestration.
- **§§ 2, 5, 6, 7, 8, 10 and 11 stand** as product properties: the `RenderPayload` is semantic (one
  renderer, no stage-specific components); Weave's prose is not the session's record beyond what
  _Open question 1_ allows; raw answers do not outlive the commit (the DataGate writes what was
  confirmed, then the session's captures and conversation context are erased); commands carry an
  expected revision and an idempotency key; identity is server-resolved; unavailable capabilities
  are absent or `coming_soon`; the public profile schemas remain the commit contract (widened for
  candidates, § 4 blank 7).
- **Migration.** Sessions pinned to `snapshot-v1` are finished by `snapshot-v1`; new sessions start
  on the runtime once its conformance suite passes; `snapshot-v1` is then retired. The two coexist
  behind the same URL for that window only. _(PROVISIONAL — see Open questions.)_

### 7. Where it lands

| Package                    | Change                                                                                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@resonance/core`          | The contracts of `docs/weave-runtime-contracts.md` as Zod schemas; the `stageType` / `followUpPolicy` / completion-rule / streaming fields on `FlowStageSchema`; the ports (`ModelProvider`, the Weave session store, `CapabilityProvider`, the DataGate targets). |
| `@resonance/weave-os`      | Corpus fields for the new stage properties; a `DefinitionRef` beside `releaseId`; the conformance fixtures.                                                                                                                                                        |
| `@resonance/db`            | Session `state` = `weave_context`; the FrequencyDatabase table(s); `InteractionSignalRecord` rows; the observation category enum.                                                                                                                                  |
| `@resonance/weave-runtime` | **New.** The modules of § 2 behind one seam.                                                                                                                                                                                                                       |
| `@resonance/ai`            | The `ModelProvider` adapter over the shared runner; the `DataExtractor` and generation capability adapters; `snapshot-v1` retired after cutover.                                                                                                                   |
| `@resonance/ui`            | The `RenderPayload` renderer, grown from `CreatorOnboardingStage` (same four input kinds, plus candidates).                                                                                                                                                        |
| `apps/web`                 | The route and the one Server Action call the runtime seam; nothing else changes.                                                                                                                                                                                   |
| `docs/architecture`        | The living diagram gains the `weave-runtime` package and its edges (ADR-0015) — it lands in the same change as the package, not with this ADR.                                                                                                                     |

## Consequences

- **The corpus becomes the program.** What Weave asks, when it follows up, when it generates, and
  what persists are all read from the governed definition. A change to the interview is a reviewed
  YAML diff under CODEOWNERS (ADR-0020 § 3), not a code change — and the runtime's conformance
  suite says when the definition and the runtime disagree.
- **Two descriptions of the interview become one.** ADR-0022's hand-modelled stages, which were a
  recorded debt, are retired once the runtime passes the same tests they pass today.
- **The Figma is now a load-bearing artefact.** Every box has a code identifier and every contract
  a schema, so parity can be checked in both directions. The cost is that the runtime must be
  re-read against the page when the designer changes it — the same discipline ADR-0019 imposes on
  screens.
- **PROVISIONAL is a real state, not a decoration.** Nine blanks ship with defaults marked as such;
  the designer's list is the artefact that clears them. A default that is never approved stays
  marked, and the conformance suite carries the mark so it is visible in test names.
- **Cost and privacy are structural.** A turn sees a slice, not the session (deviation 2); raw
  material leaves the session only through the DataGate (deviation 3; ADR-0022 § 6 kept).
- **The architecture diagram changes shape** — a package is added and edges appear
  (`weave-runtime` → `core`, `weave-os`; adapters injected from `web`). Per ADR-0015 it lands in the same change as the package.
- **`snapshot-v1` lives on for one window.** Until cutover, two behaviours can be read from the
  session table; the pin on every row is what keeps that safe.

### Open questions (the ADR-0022 collision)

1. **Conversation context vs. "no transcript".** The Figma's `weave_context` carries
   `conversation_context.messages`, its `StageState` stores `weave_prompt`, and the SessionStore
   frame's "Loading a Session" scenario (`3166:81192`) re-renders "previous conversation including
   current conversation" on resume. A generated Weave turn cannot be re-derived after a reload the
   way `snapshot-v1`'s copy can. Proposed: persist a **bounded, session-scoped** conversation
   context (the current stage's Weave prompt, a short `recent_turns` window, a
   `conversation_summary`), erased at completion with the captures. ADR-0022 § 5's rule relaxes
   from "no transcript field" to "no transcript survives the session". PROVISIONAL.
2. **Cutover.** Whether in-flight `snapshot-v1` sessions finish under `snapshot-v1` (proposed) or
   are restarted on the runtime. PROVISIONAL.
3. **The `summary` stage.** The 9/10/26 screens and `snapshot-v1` have a pre-generation summary
   stage; the corpus does not. Proposed: the designer adds it to the definition (asked on the
   designer's list); until then the runtime renders `foundation_generation`'s `transition` copy as
   that moment. PROVISIONAL.

### Revisit triggers

- When the designer answers the list: replace each PROVISIONAL default and re-run the suite.
- When chat ships: deviation 5's reserved `route_target`, the `weave_quick_chat` next experience,
  per-turn Frequency reads and pause-time gating (deviation 3) become the work.
- When the Evolution Engine is designed: deviation 8's scoring tables and ADR-0020 § 6's
  job-scoped executor.
- When the Figma page changes: re-read row 1 and the DataContract Library against
  `docs/weave-runtime-contracts.md` before touching code.

## Alternatives considered

- **Keep `snapshot-v1` and wrap the corpus as a `CreatorOnboardingBehavior` adapter** (the "consume
  via adapter" reading of ADR-0022). Rejected: the seam forbids model calls, and the Figma's turn is
  generated, extracted and evaluated by models. Fitting it behind a pure seam would mean either
  hollowing out the seam's invariants or leaving the Figma's runtime unbuilt.
- **Retranscribe the corpus from the 9/10/26 screens.** Rejected: the screens are one rendering of
  the flow; the corpus is the designer's authored flow with the constraints the screens omit
  (candidate counts, guardrails, `avoid` lists, minimum information). ADR-0020's transcription
  stands.
- **One package per Figma box.** Rejected: fourteen shallow packages for one context (ADR-0003,
  ADR-0017); the Figma's boxes are a module diagram, not a deployment diagram.
- **The full `weave_context` as prompt input, as drawn.** Rejected: token cost proportional to the
  creator's history on every turn, and every answer in every prompt (deviation 2).
- **Read Frequency and run `CoherenceResolver` per turn now.** Rejected: nothing to be coherent
  with on a first interview, and no reader yet (deviation 3).
- **No streaming (the gate read literally) / streaming before the gate.** Both rejected: the first
  makes chat stages feel dead, the second leaks un-gated content (deviation 4).
- **A separate chat runtime.** Rejected: Chat.py mirrors Stage.py (deviation 5).
- **Load definitions at runtime with a real `version_policy`.** Rejected: ADR-0020 § 1; a policy
  with one value is a field, not a subsystem (deviation 6).
- **Map the seven `applied_principles` ourselves.** Rejected again: D-06 is the designer's, and the
  validator keeps failing on it by design; the designer's list offers a reading for him to correct.
- **Wait for the designer to answer every blank before building.** Rejected: nine blanks with
  marked defaults and a list to approve moves faster than a blocked slice, and the marks make the
  difference between "decided" and "assumed" visible in code and tests.
