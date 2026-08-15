# @resonance/core

Cross-cutting types, errors, and ports shared across packages. The shared base of the
dependency graph (ADR-0003). **No domain logic, no I/O** — just the vocabulary other
packages speak.

## What's here

- `errors.ts` — `ResonanceError` (stable `code`), `NotImplementedError`,
  `ValidationError`. Throw these, not bare strings.
- `ports/storage.ts` — `StoragePort` interface + `stubStorage` (media deferred, ADR-0007).
- `types.ts` — `Role` (+ Zod schema), branded `Id<Brand>` helper.
- `onboarding.ts` — `OnboardingIntentSchema` / `ONBOARDING_INTENTS` / `isCreatorIntent`: the
  three answers the first onboarding screen offers (`explore` · `share` · `business`). A closed
  enum because it is read back off a URL. **Not a `Role`** — intent is what someone _said_ they
  came to do; `creator` is status earned by completing creator onboarding.
- `interview.ts` — `InterviewMessageSchema` / `InterviewMessage`: the shared chat
  contract (role + text) for the Weave interview, spoken by `ai`, `web`, and `ui`.
- `profile-draft.ts` — `CreatorProfileDraftSchema` (+ `NameOptionSchema`,
  `CommitProfileInputSchema`): the shared generated-draft contract for the profile the
  interview produces — `ai` generates it, `ui` edits it, `web` validates the commit.
- `embedding.ts` — `EMBEDDING_DIMS` (1024, ADR-0010) + `assertEmbeddingDims` /
  `EmbeddingDimensionError`. Where the shared vector-width constant now lives, because `db`
  (the `vector(1024)` column) cannot import `ai` (the embedder) — the dependency runs the
  other way. `@resonance/ai` and `@resonance/db` still carry their own copies pending the
  follow-up migration (seed resonance-e0e6). Guard before any vector reaches SQL: a mismatch
  matches nothing instead of erroring.
- `discovery.ts` — the **discovery contract**, i.e. the swappable ranking **seam**
  (ADR-0017). `DiscoveryQuerySchema` / `CreatorDiscoveryQuerySchema` (validation boundary
  for the search box + tab), `CreatorResultSchema` / `CreatorResultPageSchema` (the designed
  result row + its cursor-paginated envelope), `FollowStateSchema`, `ResultKindSchema` (the
  four designed tabs), and `DiscoveryPort` — one method over a large implementation
  (query vector → status-filtered ANN → tags → threshold → paging → follow state) that lives
  in `db`. `web` and `ui` depend on this interface and never on SQL; the port's invariants are
  documented on the interface and exercised by a fake adapter in `discovery.test.ts`.
  The query vector has **two sources** and the caller cannot tell which was used: the
  embedded search text, or — when `text` is **absent** — the viewer's stored interest
  embedding (invariant 8). `text` absent and `text: ""` are deliberately different: absent
  means "rank for this viewer", blank is still a malformed search and fails validation. A
  viewer with no interests gets an **empty page**, never an unranked dump.
- `interests.ts` — **member interests**, the member-side counterpart to the creator
  interview. `TopicSlugSchema` / `TopicSchema` (topics are identified by **slug, not row id**,
  because `ui`, `web`, and `db` must name the same topic across a payload) and
  `MemberInterestsSchema`, the validation boundary for the selection — minimum **zero**
  because the picker is skippable, duplicates rejected rather than deduped, and no member
  field on it (identity comes from the session, as with `DiscoveryViewer`).
  `MEMBER_INTEREST_TARGET` is the design's "Select 3 topics" copy — UI guidance, **not** a
  validation rule. The curated topic _list_ is seed data owned by `db`, not here.
  The three `weave-*` modules below are **⏸ DEFERRED (2026-07-28)**: shipped and tested, but
  no consumer wires them yet and the product still runs from the prompt literals in
  `@resonance/ai`. Leave them alone unless Jared says otherwise — context in seed
  `resonance-5c86` and the `architecture` mulch decision.

- `weave-os.ts` — the **Weave OS corpus contracts**: the shared vocabulary for Weave's
  authored behaviour. File headers + `EvolutionPolicySchema`, the record types
  (`InteractionPrincipleSchema`, `WeaveLimitationSchema`, `BehaviorRuleSchema`,
  `ConversationHeuristicSchema`), the flow definition (`InterviewFlowFileSchema` and its
  stages / flow map / session state / output constraints), and `CorpusFileSchema` — one
  discriminated-union entry point for parsing any corpus file. Also `OsReleaseIdSchema`,
  the opaque identity of one compiled corpus. Three rules hold this module together:
  **every record carries `source` + `confidence`** so a transcribed record never passes for
  an authored one; **inheritance is stored child-side only** (`inherits`), with
  `CorpusInheritedBy` as a derived view that has no schema; and **type what something
  consumes, carry what nothing consumes yet** — unmodelled authored blocks live in
  `guidance` as `CorpusValue`, validated as data and never interpreted.
- `weave-evaluation.ts` — the **16 evaluation dimensions**. The engine's ten and the seven
  interaction principles are two lists that _compose_: `principle_alignment` is the one
  composite and decomposes into one sub-score per principle, so a scored evaluation carries
  7 + 9 = 16 numbers. The composition is in the types (`ProcessDimension` is `Exclude`d from
  `EvaluationDimension`), not in a comment. Plus the corpus's `0..3` `ScoreSchema`, where
  `0` means `not_observed`.
- `weave-observation.ts` — the **observation contract**, i.e. the evidence-capture seam
  (ADR-0017), built on the same construction as `discovery.ts`. `ObservationSchema`,
  `EvaluationSchema` (schema-enforced complete coverage of all 16 dimensions),
  `LimitationVerdictSchema` (boolean, because a limitation is an invariant and "mostly
  held" is a breach), and `ObservationPort` — two methods over a batched, atomic
  implementation in `db`. Every record carries an `osReleaseId`, pinned at conversation
  start, so evidence stays attributable to the corpus that produced it. The port's
  invariants are documented on the interface and exercised by a fake adapter in
  `weave-observation.test.ts`.

## Rules

- Everything here is depended on by other packages, so keep it stable and minimal.
  Add something only when **2+ packages** need it.
- Ports (interfaces for external capabilities) live here; their concrete adapters live
  in the relevant package or app. This is how we keep logic extraction-ready.
- No dependency on any other `@resonance/*` package (it's the root of the graph).

## Working here (seeds + mulch)

Work in this package is tracked by a `core`-labelled seed — `sd ready` / `sd search core` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`core`** mulch domain: `ml record core --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
