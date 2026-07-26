# @resonance/core

Cross-cutting types, errors, and ports shared across packages. The shared base of the
dependency graph (ADR-0003). **No domain logic, no I/O** — just the vocabulary other
packages speak.

## What's here

- `errors.ts` — `ResonanceError` (stable `code`), `NotImplementedError`,
  `ValidationError`. Throw these, not bare strings.
- `ports/storage.ts` — `StoragePort` interface + `stubStorage` (media deferred, ADR-0007).
- `types.ts` — `Role` (+ Zod schema), branded `Id<Brand>` helper.
- `interview.ts` — `InterviewMessageSchema` / `InterviewMessage`: the shared chat
  contract (role + text) for the Weave interview, spoken by `ai`, `web`, and `ui`.
- `profile-draft.ts` — `CreatorProfileDraftSchema` (+ `NameOptionSchema`,
  `CommitProfileInputSchema`): the shared generated-draft contract for the profile the
  interview produces — `ai` generates it, `ui` edits it, `web` validates the commit.
- `embedding.ts` — `EMBEDDING_DIMS` (1024, ADR-0010) + `assertEmbeddingDims` /
  `EmbeddingDimensionError`. Where the shared vector-width constant now lives, because `db`
  (the `vector(1024)` column) cannot import `ai` (the embedder) — the dependency runs the
  other way. `@resonance/ai` and `@resonance/db` still carry their own copies pending the
  follow-up migration (seed resonance-52cd). Guard before any vector reaches SQL: a mismatch
  matches nothing instead of erroring.
- `discovery.ts` — the **discovery contract**, i.e. the swappable ranking **seam**
  (ADR-0017). `DiscoveryQuerySchema` / `CreatorDiscoveryQuerySchema` (validation boundary
  for the search box + tab), `CreatorResultSchema` / `CreatorResultPageSchema` (the designed
  result row + its cursor-paginated envelope), `FollowStateSchema`, `ResultKindSchema` (the
  four designed tabs), and `DiscoveryPort` — one method over a large implementation
  (embed → status-filtered ANN → tags → threshold → paging → follow state) that lives in
  `db`. `web` and `ui` depend on this interface and never on SQL; the port's invariants are
  documented on the interface and exercised by a fake adapter in `discovery.test.ts`.

## Rules

- Everything here is depended on by other packages, so keep it stable and minimal.
  Add something only when **2+ packages** need it.
- Ports (interfaces for external capabilities) live here; their concrete adapters live
  in the relevant package or app. This is how we keep logic extraction-ready.
- No dependency on any other `@resonance/*` package (it's the root of the graph).

## Working here (seeds + mulch)

Work in this package is tracked by a `core`-labelled seed — `sd ready` / `sd search core` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`core`** mulch domain: `ml record core --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
