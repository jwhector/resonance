# Weave runtime contracts — the Figma DataContract Library in one vocabulary

> **Status: PROVISIONAL where marked.** Written 2026-09-22 from the Figma file "Resonance
> 9-21-26" (key `xXo4CDHx0PxbgEPuyPJx4Z`), page _Weave OS Architecture_: the DataContract Library
> frame `3029:13977`, the six row-1 cards (`3278:20869`, `3274:24493`, `3284:40253`,
> `3280:38667`, `3284:40094`, `3278:21887`), and the WeaveCapabilities `3278:33692`,
> ProfileGeneration `3302:29222`, Completion `3317:27846`, SessionStore `3163:79858`, DataGate
> `3188:17144` and Database Related `3212:12294` frames. It is the spec `@resonance/core`
> implements as Zod schemas and the seed of the designer-facing implementation page.
> Architecture: [ADR-0023](adr/0023-weave-runtime-orchestrated-stage-workflow.md).

## How to read this document

- **Field names are the designer's `snake_case`**, verbatim. They become `camelCase` exactly once,
  at the TypeScript boundary in `@resonance/core`, by the standard transform and nothing else
  (`weave_context.session.definition_id` → `weaveContext.session.definitionId`). No field is
  renamed on the way; a rename would be a second vocabulary.
- **Types** translate the Figma's Python hints: `str` → string, `int` → number, `bool` → boolean,
  `datetime` → ISO-8601 string, `dict` → object (named where a contract exists), `list` → array,
  `Literal[…]` → enum, `X | None` → optional. A field with no type in the Figma has none here
  unless marked.
- **PROVISIONAL** marks anything the Figma or the corpus does not state: a field we added, a shape
  the Figma names but does not draw, an enum value inferred from a narrative. Nothing marked
  PROVISIONAL is approved until the designer says so
  ([designer's list](weave-runtime-designer-list.md)).
- **Producer / consumer** are Figma module names (ADR-0023 § 2). Where a contract is one module's
  output on the diagram and another's input under a different tag name, the tag names are given.
- Contracts the Figma draws but this slice does not build are listed in § 6 so nothing is lost.

## 1. Vocabulary decisions — drift collapsed once

Each row records a place where the Figma uses two names (or none) for one thing, the name chosen,
and the evidence. These are the only places this document departs from the designer's spelling.

| #   | The designer's names                                                                                                                                                         | Chosen                                                                                                                                                       | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| V1  | `TurnRequest` (Library `3038:15148`, `3045:5834`) and `ConversationRequest` (Library `3038:15154`); the tag `conversation_request` on `StageExecutor`'s outputs; the narrative "generates … turn_request. Sends conversation_request" (`3171:11446`) | **Both, distinct.** `TurnRequest` = the stage's ask, emitted by `StageExecutor` into `WeaveContextUpdater`. `ConversationRequest` = the assembled, model-ready request emitted by `ConversationRuntime` into `ModelProvider`. | The Library's `ConversationRequest` _contains_ a `turn_instruction` beside `weave_presence`, `creator_context` and `conversation_context` — it is the assembled thing; `ModelProvider`'s purpose ("translate a provider-neutral ConversationRequest") consumes it. The `StageExecutor` tag named `conversation_request` carries only what a `TurnRequest` holds. One contract would either lose the assembled fields or make the executor assemble context it does not have. |
| V2  | `prompt_request` (tag on `ConversationRuntime` → `ModelProvider`) vs `ConversationRequest`                                                                                   | `ConversationRequest`                                                                                                                                        | Same object, two names (V1). `prompt_request` is not used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| V3  | `claude_prompt_request`, `claude_generation_request`, `claude_session_title_generation_request` (Claude card `3284:40258`)                                                    | Not contracts                                                                                                                                                | They are the provider-specific translation inside the `ModelProvider` adapter — its private business, never seen by the runtime.                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| V4  | `StructuredFlowRuntime` (row 4) vs `Stage.py` (row 1)                                                                                                                        | `Stage` modules (`StageExecutor`, `StageUpdater`, `DataExtractor`, `StageEvaluator`)                                                                         | Row 1 is the declared-complete design.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| V5  | `DataContracts_ExistingCreatorInterview`, `…_ExsitingCreatorInterview`, `DataContract_Generation_ExsitingCreatorInterview` (frame names)                                     | No interview prefix anywhere                                                                                                                                 | The frames list the same contracts on every card; the name is a template leftover, not a scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| V6  | "into the selected model provider requestszf" (`ModelProvider` purpose)                                                                                                      | "requests"                                                                                                                                                   | Typo.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| V7  | `ConversationContext` short form (`3038:15100`: `interaction, current_turn, stage_context, recent_history, conversation_summary, current_topic, unresolved_threads`) vs long form (`3038:15136`) | The long form                                                                                                                                                | It is the superset. Short-form fields map: `stage_context` → `stage`; `recent_history` → `history.recent_turns`; `conversation_summary` → `history.conversation_summary`; `current_topic` → `conversation_state.current_topic`; `unresolved_threads` → `conversation_state.active_threads`.                                                                                                                                                                                                                                                                                                 |
| V8  | `InteractionContext` YAML form (`3038:15112`: `mode, flow_type, flow_id, stage_id, capability_id, entry_source`) vs structured form (`3038:15124`: `interaction_id, route_target, …`) | The structured form                                                                                                                                          | `route_target` is what `SessionManager` consumes. `mode` → `route_target`; `entry_source` → `entry.source`; `flow_type` and `capability_id` are carried as optional fields of `flow` (PROVISIONAL placement).                                                                                                                                                                                                                                                                                                                                                                              |
| V9  | `frequency_data_query_result` (FrequencyDatabase output), `frequency_query_result` (`CreatorContextResolver` input), `frequency_data_result` (floating tag `3220:79454`)      | `frequency_data_query_result`                                                                                                                                | The database's own output name; the request is `frequency_data_query`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| V10 | `missing_condition (optional)` (tag) vs `missing_conditions` (narratives)                                                                                                    | `missing_conditions: MissingCondition[]`                                                                                                                     | The narratives read the plural; an evaluator can find more than one.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| V11 | `session_store_request` vs `session_store_readiness_request` (both on `StageExecutor`; narratives use either)                                                                | Two contracts: `SessionStoreReadinessRequest` (executor → evaluator) and `SessionSaveRequest` (executor → session store)                                     | The evaluator step `3179:13277` consumes the readiness request and returns a decision; step `3166:82508` then emits the save. The Library names the save `SessionSaveRequest` (`3169:10756`).                                                                                                                                                                                                                                                                                                                                                                                              |
| V12 | `stage_state`, `current_stage_state`, `updated_stage_state`, `updated_stage_state (interaction_result)`                                                                      | One `StageState`                                                                                                                                             | "current" and "updated" are positions in a turn, not types; the qualifier says which result was last folded in.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| V13 | `ConversationContextResolver` input: `current_stage_state` (row 1, `3277:101626`) vs `conversation_request` (SessionStore frame, `3025:13471`)                                | Consumes both: `StageState` + `TurnRequest`                                                                                                                  | Both cards are the designer's; the resolver needs the stage (what is being asked) and the turn (why). PROVISIONAL.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| V14 | `WeavePresenceResolver` inputs: a `weave_os_definition_query` round trip (row 1) vs `turn_request` directly (SessionStore frame `3020:12081`)                                 | Row 1's three steps                                                                                                                                          | Row 1 is declared complete; the query is answered by `resolveWeaveOs` (ADR-0023 blank 4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| V15 | `SessionLifeCycleUpdater` / `SessionLifecycleUpdater`; `render_readiness_result` / `render_readiness_decision`; `realationship_data_write_result`                             | `SessionLifecycleUpdater`; `render_readiness_decision`; `relationship_data_write_result`                                                                     | Spelling.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| V16 | `stage_decision` values: tags say `next_stage` and `follow_up`; the ContinuousConversationGeneration narrative adds `skip`; the Completion narrative shows `type: capability` | `type: next_stage \| follow_up \| skip \| capability`                                                                                                        | Union of what the designer wrote. `skip` PROVISIONAL as a distinct value (it could be `next_stage` with the capture marked skipped).                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| V17 | `experience_id` vs `definition_id` / `flow_id` (`weave_context.session`, `InteractionContext.flow`, `DataGateRequest`)                                                        | All kept as drawn                                                                                                                                            | `experience_id` names the experience being run (`emerging_creator_onboarding`); `definition_id` + `definition_version` name the compiled definition that runs it (the `DefinitionRef`). Today they coincide; they are separate fields because a later experience may be served by a different definition version.                                                                                                                                                                                                                                                                         |
| V18 | `interaction_result (user_input, action_input, selected_option)` vs `InteractionResult` (Chat.py contract list) vs `current_turn`                                            | `InteractionResult`                                                                                                                                          | The three fields are the Frontend's whole output; `current_turn` on `SessionState` is the last one received.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| V19 | `Accepted output` / `Accepted outcomes` / `Next step prompt and options` (tags on every DefinitionLoader- and Completion-style step)                                          | Not contracts                                                                                                                                                | Unfilled template placeholders on the box component; they carry no data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

## 2. Contract index

One row per contract. Producer and consumers are module names; "definition" means the compiled
corpus file. **Fields** lists the top level; nested shapes and types are in § 3. Status: **Figma**
(fields drawn in the Library or a narrative), **Figma (name only)** (listed on a card without
fields), **corpus** (from `emerging_creator_onboarding.yaml`), **PROVISIONAL** (ours).

| Contract                                                    | Fields (top level)                                                                                                                                                                                                              | Producer                                            | Consumer(s)                                                                                                     | Figma source                                                                 | Status                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------ |
| `InteractionRequest`                                        | `trigger`, `creator_id`, `conversation_id`, `user_input`, `metadata`; + `action_input`, `selected_option`, `expected_revision`, `idempotency_key`                                                                                | Frontend                                            | InteractionRouter                                                                                               | Library `3038:15118`; narrative `3278:20884`                                 | Figma; four PROVISIONAL fields             |
| `InteractionContext`                                        | `interaction_id`, `route_target`, `creator_id`, `conversation_id`, `trigger`, `flow`, `entry`                                                                                                                                   | InteractionRouter                                   | SessionManager                                                                                                  | Library `3038:15124` (V8)                                                    | Figma                                      |
| `SessionState`                                              | `session_id`, `creator_id`, `conversation_id`, `interaction_context`, `current_turn`, `active_runtime`, `capability_state`, `lifecycle`, `created_at`, `updated_at`                                                             | SessionManager                                      | StageExecutor, DefinitionLoader, CompletionCoordinator, SessionLifecycleUpdater                                 | Library `3038:15094`; narratives `3317:28807`, `3317:28812`                  | Figma; `lifecycle` from narrative          |
| `DefinitionRequest`                                         | `definition_type`, `definition_id`, `version_policy`, `version`, `variant`                                                                                                                                                      | StageExecutor, NextExperienceResolver               | DefinitionLoader (= `resolveWeaveOs`)                                                                           | Library `3039:72606`                                                         | Figma                                      |
| `DefinitionRef`                                             | `definition_type`, `definition_id`, `version`, `location`                                                                                                                                                                       | DefinitionResolver                                  | DefinitionCoordinator; stamped into `WeaveContext.session`                                                      | Library `3039:72612`                                                         | Figma                                      |
| `DefinitionResult`                                          | `definition_ref`, `loaded_definition`, `initial_stage_id`, `follow_up_definition`                                                                                                                                               | DefinitionLoader                                    | StageExecutor                                                                                                   | steps `3039:72754`, `3276:100295` (tags only)                                | PROVISIONAL shape                          |
| `StageState`                                                | `identity`, `lifecycle`, `interaction`, `data`, `conversation`, `capability`, `generation`, `evaluation`, `render`, `error`                                                                                                     | StageExecutor (creates), StageUpdater (updates)     | StageExecutor, StageEvaluator, InterfaceRenderer, ConversationContextResolver, CapabilityCoordinator, CompletionCoordinator | Library `3045:5803`                                                          | Figma                                      |
| `InteractionResult`                                         | `user_input`, `action_input`, `selected_option`; + `interaction_id`, `session_id`, `expected_revision`, `idempotency_key`                                                                                                        | Frontend                                            | StageUpdater, DataExtractor                                                                                     | Frontend step `3012:70513`; Chat.py contract list                            | Figma; four PROVISIONAL fields             |
| `DataTarget`                                                | the stage's captures: `capture_id`, `fields{values, shape}`, `required`                                                                                                                                                         | definition                                          | DataExtractor, StageEvaluator                                                                                   | tags `3011:64063`, `3166:82150`; `ConversationContext.stage.data_target`     | corpus (`captures`); `required` PROVISIONAL |
| `ExtractedData`                                             | `captures{capture_id → {field → value}}`, `signals{uncertain, difficulty, wants_less_depth, wants_more_depth}`, `extractor{model, version}`                                                                                      | DataExtractor                                       | StageEvaluator, StageUpdater                                                                                    | tag `3011:64063`                                                             | PROVISIONAL                                |
| `StageEvaluationRequest`                                    | `stage_state`, `data_target`, `extracted_data`, `follow_up_policy`, `rules`                                                                                                                                                     | StageExecutor                                       | StageEvaluator                                                                                                  | steps `3325:86815`, `3166:82150`                                             | Figma (as five tags)                       |
| `StageDecision`                                             | `type`, `next_stage_id`, `follow_up`, `capability_id`, `operation_id`                                                                                                                                                           | StageEvaluator                                      | StageExecutor                                                                                                   | narrative `3317:28807` (`StageDecision {type, capability_id, operation_id}`) | Figma; `next_stage_id`, `follow_up` PROVISIONAL |
| `FollowUpPolicy`                                            | `maximum`, `use_when`, `prompt`                                                                                                                                                                                                 | definition                                          | StageEvaluator                                                                                                  | tag `3166:82150`; corpus `what_they_want_to_share.follow_up`                 | corpus; name PROVISIONAL                   |
| `RenderReadinessRequest` / `RenderReadinessDecision`        | `{stage_state}` → `{ready, missing_conditions}`                                                                                                                                                                                 | StageExecutor → StageEvaluator                      | StageEvaluator → StageExecutor                                                                                  | steps `3011:64120`, `3011:64112`, `3016:11175`                               | Figma (tags); fields PROVISIONAL           |
| `MissingCondition`                                          | `kind` (`conversation` \| `capability` \| `data`), `ref`                                                                                                                                                                        | StageEvaluator                                      | StageExecutor                                                                                                   | tag `3011:64112`; narrative `3278:21902`                                     | PROVISIONAL                                |
| `SessionStoreReadinessRequest` / `SessionStoreDecision`     | `{stage_state, weave_context}` → `{store, reason}`                                                                                                                                                                              | StageExecutor → StageEvaluator                      | StageEvaluator → StageExecutor                                                                                  | steps `3179:13277`, `3166:82508`                                             | Figma (tags); fields PROVISIONAL           |
| `TurnRequest`                                               | `request_type`, `purpose`, `target`, `output_requirements`; + `context_refs`                                                                                                                                                    | StageExecutor                                       | WeaveContextUpdater (all four resolvers)                                                                        | Library `3038:15148`; example `3045:5834`                                    | Figma; `context_refs` PROVISIONAL (ADR-0023 dev. 2) |
| `ConversationContext`                                       | `interaction`, `stage`, `history`, `current_input`, `conversation_state`                                                                                                                                                        | ConversationContextResolver                         | CreatorContextResolver, WeavePresenceResolver, ContextAssembler, DefinitionLoader                               | Library `3038:15136` (V7)                                                    | Figma                                      |
| `CreatorContext`                                            | `identity`, `expression`, `values`, `creative_identity`, `work`, `preferences`, `boundaries`, `direction`, `patterns`, `relationships`, `history`                                                                               | CreatorContextResolver                              | WeavePresenceResolver, ContextAssembler, GenerationContextResolver, CapabilityCoordinator                       | Library `3038:15130`                                                         | Figma (leaf names only)                    |
| `WeavePresence`                                             | `system`, `source`                                                                                                                                                                                                              | WeavePresenceResolver                               | ContextAssembler                                                                                                | steps `3277:101559`–`3278:20006` (tags only)                                 | PROVISIONAL                                |
| `WeaveContext`                                              | `identity`, `session`, `flow`, `creator_context`, `conversation_context`, `capability_context`, `revision_context`, `assets`, `runtime`                                                                                          | ContextAssembler; updated by StageUpdater, ConversationResultHandler | ConversationRuntime, StageExecutor, StageUpdater, DataGate, SessionStore                                        | Library `3143:7850`                                                          | Figma                                      |
| `WeaveContextSlice`                                         | `weave_presence`, `conversation_context`, `creator_context` (requested groups), `turn_request`                                                                                                                                  | ContextAssembler                                    | ConversationRuntime                                                                                             | —                                                                            | PROVISIONAL (ADR-0023 deviation 2)         |
| `ConversationRequest`                                       | `weave_presence`, `creator_context`, `conversation_context`, `turn_instruction`, `output_requirements`                                                                                                                          | ConversationRuntime                                 | ModelProvider                                                                                                   | Library `3038:15154`; tag `prompt_request` `2811:3490` (V1, V2)              | Figma                                      |
| `ConversationResult`                                        | `request_id`, `response_text`, `structured_content`, `suggested_actions`, `metadata`, `status`                                                                                                                                  | ConversationResultHandler                           | StageUpdater (ChatUpdater)                                                                                      | Library `3038:15142`                                                         | Figma                                      |
| `CapabilityRequest`                                         | `request_id`, `capability_id`, `operation_id`, `session_id`, `creator_id`, `source`, `input`, `context_refs`, `metadata`                                                                                                        | StageExecutor                                       | CapabilityCoordinator → Generation / Completion / ReviseWithWeave                                               | Library `3290:24368` (TypeScript)                                            | Figma                                      |
| `CapabilityResult`                                          | `request_id`, `capability_id`, `operation_id`, `status`, `output`, `error`, `session_status`                                                                                                                                    | capability, via CapabilityCoordinator               | StageUpdater                                                                                                    | Paused narrative `3317:28812`                                                | Figma (name + narrative); fields PROVISIONAL |
| `CapabilityError` / `ErrorAction`                           | `request_id`, `capability_id`, `error_id`, `message`, `retryable`; `ErrorAction = retry \| fallback \| fail`                                                                                                                    | capability → CapabilityErrorHandler                 | CapabilityCoordinator                                                                                           | step `3011:64152`; narrative `3278:33706`                                    | Figma (name + actions); fields PROVISIONAL |
| `GenerationDefinition`                                      | the flow's outputs: `id`, `candidate_count`, `recommended_candidate`, `generate_when`, `sources`, `fields`, `constraints`, visibility flags; `generation_source`                                                                 | definition                                          | GenerationContextResolver, GenerationValidator                                                                  | Generation.py contract list `3011:64326`; corpus `foundation_generation.outputs` | corpus                                     |
| `GenerationContext`                                         | `confirmed_captures`, `creator_context` (allowed groups), `expression_style`, `generation_definition`                                                                                                                            | GenerationContextResolver                           | GenerationCoordinator                                                                                           | step `3011:69392`                                                            | PROVISIONAL                                |
| `GenerationRequest` / `GenerationResult` / `GenerationValidation` | `{generation_context, output_ids}` / `{creator_name_candidates, profile_headline_candidates, about_candidates, discovery_tags, resonant_people_summary, expression_style, foundability_feedback}` / `{valid, violations}` | GenerationCoordinator / ModelProvider / GenerationValidator | ModelProvider / GenerationValidator / GenerationResultHandler                                                   | steps `3304:31638`, `3304:31119`, `3011:69328`                               | corpus (outputs); shapes PROVISIONAL       |
| `RenderRequest`                                             | `stage_state`, `mode` (`stage` \| `history` \| `chat`), `stream`                                                                                                                                                                | StageExecutor                                       | InterfaceRenderer                                                                                               | steps `3016:11184`, `3166:81193`, InterfaceRenderer `3011:64053`–`3172:12632` | PROVISIONAL                                |
| `RenderPayload`                                             | discriminated on `stage_type`: `chat` \| `options` \| `profile_foundation` \| `completion`; common `session`, `stage`, `weave`, `actions`                                                                                       | InterfaceRenderer                                   | Frontend                                                                                                        | Stage.py contract list (name only)                                           | PROVISIONAL shape                          |
| `DataGateRequest`                                           | `trigger`, `session_id`, `experience_id`, `weave_context`, `creator_selection`                                                                                                                                                  | CompletionCoordinator                               | DataGate                                                                                                        | Paused `3317:28812`; Write `3188:17176`                                      | Figma (narratives)                         |
| `DataGateResult`                                            | `status`, `persisted`, `recorded_signals`, `withheld`                                                                                                                                                                           | DataGate                                            | CompletionCoordinator                                                                                           | `3317:28812` (`status` only)                                                 | Figma (`status`); rest PROVISIONAL         |
| `FrequencySignal` / `FrequencyDataWriteRequest`             | `signal_id`, `creator_id`, `dimension`, `key`, `value`, `evidence`, `confirmed_at`, `superseded_by`                                                                                                                             | DataGate                                            | FrequencyDatabase                                                                                               | Write narrative `3188:17176`; FrequencyDatabase `3214:12973` (dimensions, operations) | PROVISIONAL (dimensions Figma)             |
| `CreatorDataWriteRequest`                                   | the committed profile (`CommitProfileInput`, existing)                                                                                                                                                                          | DataGate                                            | CreatorDatabase (the creator profile tables)                                                                    | `3218:13579`; CreatorDatabase dimensions                                     | existing                                   |
| `SessionSaveRequest`                                        | `session_id`, `creator_id`, `weave_context`                                                                                                                                                                                     | StageExecutor (via SessionCoordinator)              | SessionStore                                                                                                    | Library `3169:10756`                                                         | Figma                                      |
| `SessionReference`                                          | `session_id`, `creator_id`, `experience_id`, `definition_ref`, `session_title`, `status`, `created_at`, `updated_at`                                                                                                            | SessionCoordinator                                  | SessionStore; Frontend (session list — out of scope)                                                            | narratives `3163:79901`, `3171:11446`                                        | Figma (name); fields PROVISIONAL           |
| `InteractionSignalRecordRequest` / `InteractionSignalRecord` | `creator_id`, `session_id`, `stage_id`, `interaction_id`, `signal_types` / … `signals`, `recorded_at`; + `dimension`                                                                                                           | StageUpdater, DataGate                              | EvaluationMetricsDatabase (= `weave_observations`)                                                              | Library `3228:81474`, `3228:81480`; dimensions `3224:81119`                  | Figma; `dimension` PROVISIONAL             |
| `NextExperienceRequest` / `NextExperience`                  | `{session_state, weave_context, creator_selection}` → `{definition_id}`                                                                                                                                                         | CompletionCoordinator → NextExperienceResolver      | NextExperienceResolver → CompletionCoordinator                                                                  | narrative `3317:28807` (`NextExperience {definition_id}`)                    | Figma                                      |
| `SessionStateUpdateRequest`                                 | `operation` (`complete` \| `pause`), `session_id`                                                                                                                                                                               | CompletionCoordinator                               | SessionLifecycleUpdater                                                                                         | step `3142:7822`; Paused narrative                                           | PROVISIONAL                                |
| `CoherenceRequest` / `CoherenceResult`                      | as drawn                                                                                                                                                                                                                        | CreatorContextResolver / CoherenceResolver          | CoherenceResolver / CreatorContextResolver                                                                      | Library `3212:12258`, `3212:12264`                                           | Figma; behind a flag, off                  |

## 3. Contract shapes

Written in the designer's style. `?` marks optional. `# P` marks a PROVISIONAL field or value.

### InteractionRequest — Frontend → InteractionRouter

```
InteractionRequest {
    trigger: str                  # "weave.emerging_creator_interview" | "weave.chat" | "weave.end"
    creator_id: str               # resolved server-side, never from the browser (ADR-0022 § 8 kept)
    conversation_id: str | None
    user_input: str | None
    action_input: str | None      # P — the action id pressed
    selected_option: str | dict | None   # P
    expected_revision: int        # P — ADR-0022 § 7 kept
    idempotency_key: str          # P
    metadata: dict | None
}
```

### InteractionContext — InteractionRouter → SessionManager

```
InteractionContext {
    interaction_id: str
    route_target: "chat" | "structured_flow"
    creator_id: str
    conversation_id: str
    trigger: str
    flow: {
        flow_id: str | None
        stage_id: str | None
        flow_type: "interview" | "creation" | "revision" | None   # P placement (from 3038:15112)
        capability_id: str | None                                  # P placement
    }
    entry: {
        user_input: str | None
        source: "frontend" | "capability_result" | "continuation"
    }
}
```

### SessionState — SessionManager → StageExecutor, DefinitionLoader, Completion

```
SessionState {
    session_id, creator_id, conversation_id,
    interaction_context: InteractionContext,
    current_turn: { user_input, action_input, selected_option },
    active_runtime: {
        runtime_type: "chat" | "stage",
        flow_id,                # optional
        stage_id                # optional
    },
    capability_state: { active_capability_id, pending_request },
    lifecycle: {                # P — the narratives write SessionState.status → completed | paused
        status: "active" | "paused" | "completed",
        definition_ref: DefinitionRef   # P — ADR-0023 deviation 6
    },
    created_at, updated_at
}
```

### DefinitionRequest / DefinitionRef / DefinitionResult — StageExecutor ⇄ DefinitionLoader

```
DefinitionRequest { definition_type: str, definition_id: str, version_policy: str, version: str | None, variant: str | None }
DefinitionRef     { definition_type: str, definition_id: str, version: str, location: str }
DefinitionResult {                                   # P — the Figma names the tags, not the fields
    definition_ref: DefinitionRef                    # version = flow file version + corpus releaseId
    loaded_definition: InterviewFlowFile             # the compiled corpus file (ADR-0020 § 1)
    initial_stage_id: str
    follow_up_definition: { stage_id, prompt, maximum }  # P — derived from the stage's follow_up_policy
}
```

`version_policy` has one value in this slice, the compiled release; `location` is
`@resonance/weave-os`.

### StageState — the stage machine's record for one stage (Library `3045:5803`, verbatim)

```
StageState {
    identity:     { session_id: str, flow_id: str, stage_id: str, stage_number: int | None, definition_ref: str | None },
    lifecycle:    { status: "initialized" | "active" | "waiting" | "completed" | "failed",
                    entered_at: datetime | None, updated_at: datetime | None, completed_at: datetime | None },
    interaction:  { user_input: str | None, action_input: str | None, selected_option: str | dict | None },
    data:         { extracted_data: dict | None, confirmed_data: dict | None },
    conversation: { weave_prompt: str | None, conversation_result_id: str | None },
    capability:   { active_capability_id: str | None,
                    capability_status: "idle" | "pending" | "running" | "completed" | "failed",
                    capability_result: dict | None, next_capability_request: dict | None },
    generation:   { generated_content: dict | None },
    evaluation:   { render_readiness: bool, stage_decision: dict | None, follow_up_count: int },
    render:       { render_status: "not_ready" | "ready" | "rendered", render_payload_id: str | None },
    error:        { error_code: str | None, error_message: str | None, retry_count: int }
}
```

`data.extracted_data` is an `ExtractedData`; `data.confirmed_data` is what the creator submitted
(the capture values); `evaluation.stage_decision` is a `StageDecision`.

### InteractionResult — Frontend → StageUpdater, DataExtractor

```
InteractionResult { user_input: str | None, action_input: str | None, selected_option: str | dict | None,
                    interaction_id, session_id, expected_revision, idempotency_key }   # last four P
```

### DataTarget, ExtractedData, StageEvaluationRequest, StageDecision, FollowUpPolicy, MissingCondition

```
DataTarget {                     # = the stage's `captures` in the corpus
    capture_id: str
    fields: { field → { values: str[], shape: str | None } }
    required: bool               # P — true for captures named by the stage's completion rule
}
ExtractedData {                  # P
    captures: { capture_id → { field → value } }
    signals: { uncertain: bool, difficulty: bool, wants_less_depth: bool, wants_more_depth: bool }  # P — feed the D-07 branches
    extractor: { model: str, version: str }
}
StageEvaluationRequest { stage_state: StageState, data_target: DataTarget, extracted_data: ExtractedData | None,
                         follow_up_policy: FollowUpPolicy, rules: str[] }
StageDecision {
    type: "next_stage" | "follow_up" | "skip" | "capability"     # `skip` P (V16)
    next_stage_id: str | None                                    # P
    follow_up: { reason: str, prompt: str | None } | None        # P
    capability_id: str | None                                    # e.g. "generation", "completion"
    operation_id: str | None                                     # e.g. "complete", "pause"
}
FollowUpPolicy { maximum: int, use_when: str[], prompt: str | None }    # from the corpus's follow_up block
MissingCondition { kind: "conversation" | "capability" | "data", ref: str }   # P
```

### TurnRequest — StageExecutor → WeaveContextUpdater (Library `3038:15148`)

```
TurnRequest {
    request_type: "respond" | "stage_prompt" | "follow_up"
    purpose: str                        # e.g. understand_why_creator_began
    target: str | None                  # stage_id
    output_requirements: dict | None    # e.g. { response_type: "stage_prompt", reason: "missing_required_data" }
    context_refs: {                     # P — ADR-0023 deviation 2: what this turn may see
        creator_context_groups: str[]   # names from CreatorContext, e.g. ["expression", "work"]
        recent_turns: int
    }
}
```

### ConversationContext — ConversationContextResolver → resolvers (Library `3038:15136`)

```
ConversationContext {
    interaction:        { mode: "interview" | "regular_chat" | "revise" | "generation", conversation_id, current_turn, current_intent },
    stage:              { flow_id, stage_id, stage_number, stage_type, purpose, data_target, rules, avoid, actions, selected_option },
    history:            { recent_turns, conversation_summary, relevant_prior_turns },
    current_input:      { user_input, action_input, selected_option },
    conversation_state: { unresolved_questions, current_topic, current_emotional_tone, active_threads }
}
```

`stage.stage_type`, `stage.rules`, `stage.avoid`, `stage.actions` and `stage.data_target` are the
definition's `stageType`, `guardrails`, `avoidLanguage`, `actions` and `captures` (§ 4).

### CreatorContext — CreatorContextResolver → resolvers, generation (Library `3038:15130`)

Eleven groups, leaf names verbatim. This slice **produces** the leaves marked `*` (from onboarding
captures, through the DataGate); the rest are carried as the designer's guidance for later
experiences and stay empty.

```
CreatorContext {
    identity:          { creator_name*, preferred_name, self_description, roles, practices, location_context },
    expression:        { creator_language*, recurring_words*, phrases_they_use*, tone_preferences, communication_style, storytelling_style },
    values:            { expressed_values, things_they_care_about, things_they_protect, motivations*, intentions* },
    creative_identity: { mediums, practices*, materials, themes*, aesthetic_preferences, sensory_preferences, inspirations, symbols, motifs },
    work:              { offerings*, current_projects, past_projects, skills, methods, audiences*, relationships_to_work },
    preferences:       { likes, dislikes, interaction_preferences, pace_preference, amount_of_guidance, feedback_preferences },
    boundaries:        { avoids, sensitivities, explicitly_rejected_directions },
    direction:         { current_focus, current_questions, aspirations, possibilities_being_explored, decisions_in_progress },
    patterns:          { recurring_themes, recurring_choices, decision_patterns, expression_patterns },
    relationships:     { people_they_want_to_serve*, communities, collaborators, audience_language },
    history:           { important_creator_moments*, previous_directions, changed_preferences, meaningful_decisions }
}
```

### WeavePresence — WeavePresenceResolver → ContextAssembler

```
WeavePresence {                    # P — the Figma draws the resolver's steps, not the fields
    system: str                    # the composed philosophy + principles (`resolveWeaveOs(...).system`)
    source: DefinitionRef          # which corpus release produced it
}
```

### WeaveContext — the persisted session record (Library `3143:7850`, verbatim)

```
weave_context:
  identity:             { creator_id, user_id }
  session:              { session_id, experience_id, definition_id, definition_version, status, started_at, updated_at }
  flow:                 { current_stage_id, previous_stage_id, stage_history: [],
                          stage_state: { collected_data: {}, working_data: {}, generated_data: {}, selections: {}, metadata: {} } }
  creator_context:      { creator_identity: {}, creator_expression: {}, offering_context: {}, visual_context: {}, identity_notes: {}, preferences: {} }
  conversation_context: { messages: [], conversation_summary, latest_user_message, latest_weave_message }
  capability_context:   { pending_capability, capability_results: {} }
  revision_context:     { active: false, target_queue: [], working_values: {}, accepted_revisions: {}, completed_targets: [], skipped_targets: [] }
  assets:               { asset_references: [] }
  runtime:              { last_interaction_id, last_render_payload, pending_action }
```

Notes. `session.definition_id` + `definition_version` are the `DefinitionRef` (ADR-0023
deviation 6); `session.status` mirrors `SessionState.lifecycle.status`. `conversation_context.messages`
is kept and re-rendered on resume (decided 2026-09-23); whether it is erased at completion is
still open — ADR-0023 _Open question 1_. `revision_context` and `assets` are carried empty this slice.

### WeaveContextSlice — ContextAssembler → ConversationRuntime (PROVISIONAL, ADR-0023 deviation 2)

```
WeaveContextSlice { weave_presence: WeavePresence, conversation_context: ConversationContext,
                    creator_context: Partial<CreatorContext>,   # only the groups the TurnRequest named
                    turn_request: TurnRequest }
```

### ConversationRequest — ConversationRuntime → ModelProvider (Library `3038:15154`)

```
ConversationRequest { weave_presence, creator_context, conversation_context, turn_instruction: TurnRequest, output_requirements }
```

### ConversationResult — ConversationResultHandler → StageUpdater (Library `3038:15142`)

```
ConversationResult {
    request_id: str,
    response_text: str,
    structured_content: dict | None,
    suggested_actions: list | None,
    metadata: { provider, model, finish_reason, token_usage },
    status: "success" | "partial" | "failed"
}
```

### CapabilityRequest — StageExecutor → CapabilityCoordinator (Library `3290:24368`, verbatim)

```
type CapabilityRequest<TInput = unknown> = {
  request_id: string
  capability_id: string          // "generation" | "completion" this slice; "image", "revise_with_weave" reserved
  operation_id: string           // generation: "profile_foundation"; completion: "complete" | "pause"
  session_id: string
  creator_id?: string
  source: { executor: string; stage_id?: string }
  input: TInput
  context_refs?: { weave_context?: boolean; creator_context?: boolean; asset_ids?: string[] }
  metadata?: { parent_request_id?: string; created_at?: string }
}
```

### CapabilityResult / CapabilityError / ErrorAction — capability → CapabilityCoordinator → StageUpdater

```
CapabilityResult {                 # P — fields from the Paused narrative (3317:28812) plus what StageUpdater needs
    request_id, capability_id, operation_id,
    status: "success" | "partial" | "failed",
    output: dict | None,           # generation: GenerationResult; completion: { next_experience, data_gate_result }
    error: CapabilityError | None,
    session_status: "active" | "paused" | "completed" | None
}
CapabilityError { request_id, capability_id, error_id: str, message: str, retryable: bool }   # P
ErrorAction = "retry" | "fallback" | "fail"        # Figma: retry is limited to one attempt
```

### GenerationDefinition / GenerationContext / GenerationRequest / GenerationResult / GenerationValidation

`GenerationDefinition` is the flow's `foundation_generation.outputs` and `generation_source` as the
corpus authors them (`FlowOutput[]` in `@resonance/core`): for each output its `candidate_count`,
`recommended_candidate`, `generate_when`, `sources`, `fields`, `constraints` (`character_count`,
`item_count`, `include`, `avoid`, `rules`) and the four visibility flags.

```
GenerationContext {                # P — "select only confirmed creator context that is allowed to enter generation"
    confirmed_captures: [{ stage_id, capture_id, question, values }]   # flow order; skipped stages absent
    creator_context: Partial<CreatorContext>                            # the groups the definition's generation_source names
    expression_style: { source, selected_labels, creator_description } | None
    generation_definition: GenerationDefinition
}
GenerationRequest  { generation_context, output_ids: str[] }           # P
GenerationResult {                                                     # the corpus's outputs; shape P
    creator_name_candidates: [{ name, brief_rationale }] | None        # 3, only when creator_name_status == wants_support
    profile_headline_candidates: [str]                                 # 3, 50–100 chars, recommended_candidate = 1
    about_candidates: [str]                                            # 3, ≤ 500 chars, recommended_candidate = 1
    discovery_tags: [str]                                              # 5–10
    resonant_people_summary: str | None                                # supporting, not public
    expression_style: str | None                                       # supporting, not public
    foundability_feedback: { status, clarity_area, message }           # supporting, shown during review
}
GenerationValidation { valid: bool, violations: [{ output_id, rule }] }   # P — one retry cycle on invalid
```

### RenderRequest / RenderPayload — StageExecutor → InterfaceRenderer → Frontend

```
RenderRequest { stage_state: StageState, mode: "stage" | "history" | "chat", stream: bool }   # P

RenderPayload {                                        # P — the Figma names it and draws no fields
    session:  { session_id, revision, status },
    stage:    { stage_id, stage_number, stage_count, stage_type },
    weave:    { text: str[] } | { stream: true },      # paragraphs, or a stream handle inside the approved envelope
    actions:  [{ id, label, emphasis: "primary" | "secondary" | "text", availability: "available" | "coming_soon" }],
    notice:   str | None,                              # rejection or generation_failed, for the renderer to explain
    stage_type: "chat"               → input: { placeholder, multiline, max_length, required }
              | "options"            → options: [{ id, label, description? }], custom_text_option_id: str | None, max_select: int
              | "profile_foundation" → candidates: GenerationResult, selected: { creator_name?, headline, about, discovery_tags }, editable: true
              | "completion"         → committed_profile_ref, next_experience: NextExperience
}
```

The four `stage_type` variants are the four `input.kind`s ADR-0022's `StageRenderModel` already
renders (`none`/`text`/`choice`/`foundation`), plus candidates.

### DataGateRequest / DataGateResult — CompletionCoordinator ⇄ DataGate

```
DataGateRequest {                        # Paused narrative (3317:28812) + Write narrative (3188:17176)
    trigger: "session_completed" | "session_paused"
    session_id, experience_id,
    weave_context: WeaveContext,
    creator_selection: dict | None       # what the creator accepted at the foundation stage
}
DataGateResult {
    status: "success" | "partial" | "failed",
    persisted:        { frequency: [signal_id], creator: [field] },                  # P
    recorded_signals: [InteractionSignalRecord],                                     # P
    withheld:         [{ candidate, question: 1 | 2 | 3 | 4 | 5, reason }]           # P — which of the five questions said no
}
```

### FrequencySignal / FrequencyDataWriteRequest — DataGate → FrequencyDatabase

```
FrequencySignal {                        # P — "FrequencyDatabase writes/updates FrequencySignal[]" (3188:17176); ids like freq_102 (3212:12264)
    signal_id: str
    creator_id: str
    dimension: "identity" | "knowing" | "value" | "intention" | "theme" | "experience" | "practice" | "preference" | "need" | "context"
    key: str                             # e.g. "value.craftsmanship" — dimension-qualified, as the coherence example writes them
    value: str
    evidence: { experience_id, session_id, stage_id, capture_id }
    confirmed_at: datetime
    superseded_by: str | None            # the Figma's "supersede" operation
}
FrequencyDataWriteRequest { creator_id, signals: FrequencySignal[] }
```

Operations drawn on every database: `write`, `query`, `update`, `supersede`.

### SessionSaveRequest / SessionReference — StageExecutor → SessionCoordinator → SessionStore

```
SessionSaveRequest { session_id, creator_id, weave_context }                                   # Library 3169:10756
SessionReference   { session_id, creator_id, experience_id, definition_ref, session_title: str | None,
                     status, created_at, updated_at }                                          # P — the index entry the narratives describe
```

`session_title` is generated by `ModelProvider` for new sessions in the Figma; not built this slice
(the Sessions tab is out of scope).

### InteractionSignalRecordRequest / InteractionSignalRecord — → EvaluationMetricsDatabase (Library `3228:81474`, `3228:81480`)

```
InteractionSignalRecordRequest { creator_id, session_id, stage_id, interaction_id, signal_types }
InteractionSignalRecord {
    creator_id, session_id, stage_id, interaction_id,
    signals: { dwell_time_ms, revision_count, option_changes, abandonment, completion, ... },
    dimension: <one of the ten EvaluationMetricsDatabase dimensions>,     # P — ADR-0023 deviation 8
    recorded_at
}
```

Dimensions (`3224:81119`): `completion`, `friction`, `alignment`, `principle_evaluation`,
`conversation_efficiency`, `output_quality`, `refinement_behavior`, `preference_learning`,
`question_effectiveness`, `pattern_discovery`. The corpus's `evaluationSignals` block names the
signals under `completion`, `friction`, `alignment`, `pacing` and `output_quality`; `pacing` is not
one of the ten and is asked on the designer's list.

### NextExperienceRequest / NextExperience / SessionStateUpdateRequest — inside Completion

```
NextExperienceRequest { session_state, weave_context, creator_selection }      # P bundle of the coordinator's inputs
NextExperience        { definition_id: str }                                    # Figma: weave_quick_chat; this slice: profile page (P)
SessionStateUpdateRequest { operation: "complete" | "pause", session_id }       # P
```

## 4. Flow schema additions (`FlowStageSchema` in `packages/core/src/weave-os.ts`)

The Figma's `ConversationContext.stage` and `StageEvaluator` inputs name fields the corpus schema
does not carry yet. All names are PROVISIONAL until the designer approves the definition schema
(ADR-0023 blank 1).

| Field (camelCase in TS)        | Figma / corpus name                          | Type                                                                  | Source                                                                | Status                 |
| ------------------------------ | -------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------- |
| `stageType`                    | `stage_type` (`ConversationContext.stage`)   | `"chat" \| "options" \| "profile_foundation" \| "completion"`         | Figma names the field, not the values; values from the RenderPayload | PROVISIONAL values     |
| `followUpPolicy`               | `follow_up_policy` (StageEvaluator input)    | `{ maximum: int, useWhen: string[], prompt?: string }`                | corpus `follow_up` block (`maximum_follow_ups`, `use_when`, `prompt`) | PROVISIONAL name       |
| `completionRule`               | — (StageEvaluator's `rules`)                 | `{ requires: [{ captureId, field? }] }`                               | none written in the Figma (ADR-0023 blank 2)                          | PROVISIONAL            |
| `streaming`                    | —                                            | `boolean`, default `true` for `chat`, `false` otherwise               | ADR-0023 deviation 4                                                  | PROVISIONAL            |
| `captures` (existing)          | `data_target`                                | unchanged                                                             | —                                                                     | mapping recorded       |
| `guardrails` (existing)        | `rules`                                      | unchanged                                                             | —                                                                     | mapping recorded       |
| `avoidLanguage` (existing)     | `avoid`                                      | unchanged                                                             | —                                                                     | mapping recorded       |
| `actions` (existing)           | `actions`                                    | unchanged; `label` becomes required at runtime                        | labels: designer's list item 1                                        | mapping recorded       |
| `outputs` (existing)           | `generation_definition`                      | unchanged                                                             | —                                                                     | mapping recorded       |
| `minimumInformation` (existing) | generation gate                             | unchanged; read by the evaluator before a `generation` capability     | —                                                                     | mapping recorded       |

Per-stage values for the eleven stages (type, policy, rule) are proposed on the designer's list,
items 3 and 4, not here.

## 5. Where the existing contracts on `main` stand (ADR-0022 → this vocabulary)

| Existing (`@resonance/core`, ADR-0022)                                          | Nearest contract here                              | What changes                                                                                                                          |
| ------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `TransitionCommand { action, expectedRevision, idempotencyKey, input }`         | `InteractionRequest` / `InteractionResult`         | `action` → `action_input`; `input.text` → `user_input`; `input.choiceId` → `selected_option`; revision and key kept.                   |
| `StageRenderModel { stage, prompt, input, actions, progress }`                  | `RenderPayload`                                    | `prompt` → `weave.text`; `input.kind` → `stage_type`; `progress` → `stage`; candidates added for `profile_foundation`.                 |
| `ActiveCreatorOnboardingSession { slots, draft, currentStage, behaviorVersion, revision }` | `WeaveContext` (+ `SessionState.lifecycle`) | `slots` → `flow.stage_state.collected_data`; `draft` → `flow.stage_state.generated_data` + `selections`; `behaviorVersion` → `session.definition_id/version`. |
| `CompletedCreatorOnboardingSession { committedProfile }`                        | `WeaveContext` after the DataGate                  | Unchanged property: no captures survive completion.                                                                                   |
| `FoundationGenerationRequest { behaviorVersion, answers[] }`                    | `GenerationContext.confirmed_captures`             | Same idea; answers gain the corpus capture ids and the creator-context groups the definition names.                                    |
| `FoundationGenerationResult { draft }` / `CreatorProfileDraft`                  | `GenerationResult`                                 | One headline/bio/four tags → three candidates each and 5–10 tags; `nameOptions` → `creator_name_candidates`.                          |
| `CreatorOnboardingBehavior` (four pure methods)                                 | the `weave-runtime` seam                           | Superseded (ADR-0023 § 6).                                                                                                            |
| `CreatorOnboardingSessionStore.load/save/complete`                              | SessionStore port                                  | Same three methods; `state` holds `weave_context`.                                                                                    |
| `weave_observations.category` (`creator` \| `weave` \| `relationship`)          | `InteractionSignalRecord.dimension`                | Replaced by the ten dimensions (ADR-0023 deviation 8).                                                                                |

## 6. Drawn, not built this slice

Listed so the vocabulary is complete and nothing is renamed later: `ChatState` (`3038:15106`),
`AvailableRevisionTargets` (`3098:65142`), `RevisionState` (`3098:65148`), `TargetQueueResult`
(`3098:65154`), `RevisionDirection` (`3098:65171`), `RevisionResult` (`3098:65180`),
`RevisionConfig` (`3100:65186`), `RevisionContext` (`3111:66229`), `OptionGenerationSpec`
(`3291:24428`), `ImageSearchSpec` (`3291:24453`), `VisualIdentityNoteWriteRequest/Result`,
`CreatorDataQuery`, `RelationshipData*`, `SessionList` / `SessionGetResult` (`3163:79901`,
`3166:81192`), and the `session_title_generation_request` path.

## Appendix — module step contracts, as drawn

Each line is one step frame: inputs → outputs, with the Figma frame that draws it. Tag names are
verbatim (before the § 1 collapse), so a reader can check the diagram directly.

**StageExecutor** (`3011:64083`)

1. `session_state` → `definition_request` (`3011:64086`)
2. `definition_request` → `definition_result`, `follow_up_definition` (`3276:100798`)
3. `definition_result`, `session_state` → `current_stage_state`, `conversation_request`, `capability_request (optional)`, `session_store_readiness_request (optional)`, `creator_context (optional)` (`3012:70314`)
4. `updated_stage_state` → `render_readiness_request`, `current_stage_state (optional)` (`3011:64120`)
5. `render_readiness_decision`, `current_stage_state`, `missing_condition (optional)`, `weave_context (optional)` → `render_request`, `current_stage_state`, `conversation_request (optional)`, `capability_request (optional)`, `creator_context (optional)` (`3016:11175`)
6. `updated_stage_state (interaction_result)` → `stage_evaluation_request` (`3325:86815`)
7. `stage_decision (next_stage)`, `definition_result`, `weave_context` → `current_stage_state`, `conversation_request`, `capability_request (optional)`, `session_store_readiness_request (optional)`, `creator_context (optional)` (`3179:13015`)
8. `stage_decision (follow_up)`, `follow_up_definition` → `conversation_request` (`3325:87754`)
9. `session_store_decision` → `session_store_request`, `weave_context` (`3166:82508`)
10. `weave_context` → `conversation_history`, `render_request` (`3166:81193`)

**StageUpdater** (`3011:63994`): `conversation_result`, `weave_context`, `current_stage_state` → `updated_stage_state`, `weave_context` (`3011:63997`) · `capability_result`, `current_stage_state` → `updated_stage_state` (`3013:5750`) · `interaction_result`, `current_stage_state` → `updated_stage_state` (`3011:64013`)

**DataExtractor** (`3011:64060`): `interaction_result`, `data_target` → `extracted_data` (`3011:64063`)

**StageEvaluator** (`3011:64034`): `render_readiness_request` → `render_readiness_decision`, `missing_condition (optional)` (`3011:64112`) · `session_store_readiness_request` → `session_store_decision` (`3179:13277`) · `stage_evaluation_request`, `data_target`, `extracted_data`, `follow_up_policy`, `rules` → `stage_decision` (`3166:82150`)

**InteractionRouter** (`3027:13514`): `interaction_request` → `interaction_context` (`3027:13516`)

**SessionManager** (`3035:14047`): `interaction_context`, `route_target` → `session_state` (`3035:14049`) · `session_state_request` → `session_state` (`3330:107672`)

**DefinitionLoader** (`3039:72681`): `definition_request`, `session_state (optional)`, `conversation_context` → `definition_result` (`3039:72683`) · **DefinitionResolver**: `definition_request`, `session_state (optional)` → `definition_reference` (`3039:72739`) · **DefinitionCoordinator**: `definition_reference` → `loaded_definition` (`3039:72754`); `loaded_definition`, `initial_stage_id` → `definition_result`, `follow_up_definition` (`3276:100295`)

**WeaveContextUpdater** (`3277:101247`): `conversation_request` → `weave_context` (`3277:101663`) · `weave_context_request` → `weave_context` (`3330:108146`) · **ConversationContextResolver**: `current_stage_state` → `conversation_context` (`3277:101626`) · **CreatorContextResolver**: `conversation_context`, `conversation_request` → `frequency_data_query` (`3277:101574`); + `frequency_query_result` → `coherence_request` (`3277:101583`); + `coherence_result` → `creator_context` (`3277:101593`) · **WeavePresenceResolver**: `conversation_context`, `creator_context`, `conversation_request` → `weave_os_definition_query` (`3277:101559`); → `weave_os_definition_result` (`3278:19990`); + contexts → `weave_presence` (`3278:20006`) · **ContextAssembler**: `conversation_request`, `conversation_context`, `creator_context`, `weave_presence` → `weave_context` (`3277:101642`)

**ConversationRuntime** (`2811:3488`): `weave_context` → `prompt_request` (`2811:3490`)

**ModelProvider** (`2811:3476`): `prompt_request` → `raw_prompt` (`2811:3478`) · `profile_generation_request` → `raw_profile_generation` (`2971:3380`) · `session_title_generation_request` → `session_title` (`3167:83075`)

**ConversationResultHandler** (`3035:14070`): `raw_prompt`, `weave_context` → `conversation_result`, `weave_context` (`3035:14072`)

**InterfaceRenderer** (`3011:64051`): `render_request`, `updated_stage_state` → `render_payload` (`3011:64053`) · `render_request`, `conversation_history` → `render_payload` (`3069:11554`) · `render_request`, `updated_chat_state` → `render_payload` (`3172:12632`)

**Frontend** (`2901:1219`): `creator interaction` → `flow_trigger` (`2901:1221`) · `render_payload` → `interaction_result (user_input, action_input, selected_option)` (`3012:70513`) · `session_list` → `session_title`, `session_reference` (`3188:15164`)

**CapabilityRegistry** (`3011:69345`): `capability_id` → `shared_module`, `expression`, `utility` (`3011:69347`) · **CapabilityCoordinator** (`3011:69368`): `capability_request`, `creator_context (optional)`, `current_stage_state (optional)` → `capability_result` (`3011:69370`) · **CapabilityErrorHandler** (`3011:64150`): `capability_error`, `current_stage_state` → `error_action.retry | fallback | fail` (`3011:64152`)

**Generation.py** (`2974:4374`): **GenerationContextResolver**: `capability_request`, `creator_context`, `generation_definition` → `generation_context` (`3011:69392`) · **GenerationCoordinator**: `generation_context` → `profile_generation_request` (`3304:31638`); `raw_profile_generation` → `capability_result` (`3304:31041`) · **GenerationValidator**: `raw_profile_generation`, `generation_definition` → `raw_profile_generation`, `generation_validation` (`3304:31119`) · **GenerationResultHandler**: `raw_profile_generation`, `generation_validation` → `raw_profile_generation`, `generation_request (optional)` (`3011:69328`)

**Completion.py** (`3142:7789`): **CompletionCoordinator**: `capability_request`, `current_stage_state` → `session_state_request`, `weave_context_request`, `creator_selection` (`3330:108025`); `session_state_request` → `session_state` (`3331:108267`); `weave_context_request` → `weave_context` (`3331:108353`); `weave_context` → `conversation_history` (`3331:108517`); `session_state`, `weave_context`, `creator_selection`, `conversation_history` → `data_gate_request`, `next_experience_request`, `session_state_update_request`, `visual_identity_note_write_request (optional)` (`3142:7807`); `updated_session_state`, `definition_request`, `data_gate_result`, `visual_identity_note_write_result (optional)` → `capability_result` (`3274:23686`) · **SessionLifecycleUpdater**: `session_state_update_request`, `session_state` → `updated_session_state` (`3142:7822`) · **NextExperienceResolver**: `next_experience_request` → `definition_request` (`3143:7863`) · **DataGate** (completion side): `data_gate_request`, `weave_context` → `data_gate_result` (`3143:7883`)

**DataGate** (`3215:12238`): `data_gate_request`, `weave_context` → process `extract`, `classify`, `persistent/confirmation_gate` → `data_gate_result` (`3215:12299`); gate questions `3215:12269`–`12281`; destinations "Persist to data layer (Confirmed context)" `3215:12245`, "Record as learning signal (EvaluationMetricsDatabase)" `3215:12247`

**SessionCoordinator** (`3169:10722`): `session_save_request` → `session_reference`, `weave_context`, `session_title_generation_request (optional)` (`3169:10724`) · **SessionStore** (`3158:22184`): `weave_context`, `session_reference` → `session_reference_list` (`3166:82790`); `session_id` → `weave_context` (`3158:22193`); `creator_id` → `session_reference_list` (`3169:10766`)

**Data layer**: **FrequencyDatabase** `frequency_data_write_request` → `frequency_data_write_result` (`3214:12973`); `frequency_data_query` → `frequency_data_query_result` (`3217:13404`) · **CreatorDatabase** `creator_data_write_request` → `creator_data_write_result` (`3218:13579`); query (`3218:13586`) · **EvaluationMetricsDatabase** `interaction_signal_record_request` → `interaction_signal_record_result` (`3224:81104`); query (`3224:81111`) · **RelationshipDatabase** (out of scope) `3276:98316`, `3276:98364`
