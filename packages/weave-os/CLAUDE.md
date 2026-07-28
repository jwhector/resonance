# @resonance/weave-os

**Weave's authored behaviour, as a versioned corpus behind one resolver seam.** What
Weave says is a governed YAML file with a version, provenance and named approvers — not a
string literal (ADR-0020). Depends on `@resonance/core` and nothing else.

## The seam

```ts
resolveWeaveOs({ flow, context }) → { system, flow, outputs, releaseId }
```

Behind it: parse → validate → resolve inheritance → route → activate → compose → stamp.
Four return values because the corpus holds three kinds of content:

- **`system`** — the composed prompt. Philosophy, principles, active rules, active
  heuristics, and each stage's purpose and copy.
- **`flow`** — the machinery: `flowMap`, `sessionState`, per-stage `captures` and
  `actions`. Typed and validated, and **deliberately not executed**. The gap between what
  the corpus specifies and what the runtime does is the tracked artefact a future
  evaluator scores; it is not an omission. **Do not implement the 11-stage interview
  here** — that is an explicit non-goal.
- **`outputs`** — generation constraints, keyed by output id. Validates a generated
  artefact; it is not prompt copy.
- **`releaseId`** — a content hash of the compiled corpus, pinned once per conversation and
  stamped onto every observation so evidence stays attributable.

Second export: `weaveOsDiagnostics()` — every cross-file problem in the shipped corpus.

## Layout

```
corpus/root/     philosophy, principles, behaviour rules, conversation heuristics, modules/
corpus/active/   one file per creator-facing conversation
corpus/registry/ the Pattern Registry RULEBOOK only
src/             compile → validate → resolve, plus the generated corpus module
DEFECTS.md       every defect found in the source documents, for the designer
```

**The corpus paths are fixed by `CODEOWNERS`.** Its patterns encode the § 15 approval
tiers and were written before the corpus existed. Change both together or neither.

## Rules

1. **Never edit `docs/Weave*.md` or `docs/Emerging*.md`.** They are verbatim Google Docs
   exports and their indentation is the semantics. `.prettierignore` protects them. Read
   them; never write them.
2. **Never redefine a `@resonance/core` schema.** `CorpusFileSchema` and friends are the
   shared vocabulary four packages agree on. The one local schema here —
   `PatternRegistryRulebookSchema` — exists because `core` deliberately left the registry
   body unmodelled; it composes `CorpusFileHeaderSchema` rather than restating it, and it
   graduates to `core` the moment a second package needs it.
3. **Every record carries `source` and `confidence`.** Transcribed content is
   `derived_from:<document>` + `design_hypothesis` unless the source says otherwise. A
   transcribed record must never read as an authored one.
4. **Inheritance is stored child-side only** (`inherits`). The parent-side view is derived,
   never authored (ADR-0020 § 5).
5. **Log defects; never silently correct them.** If a source document does not determine
   an answer, carry what it says, add an entry to `DEFECTS.md`, and stop. Authoring the
   designer's semantics is the failure this whole scheme exists to prevent.
6. **No runtime filesystem reads.** YAML is the authoring format; `src/corpus.generated.ts`
   is what ships (ADR-0020 § 1).

## Editing the corpus

```bash
# after any change under corpus/
pnpm --filter @resonance/weave-os corpus:compile   # regenerate src/corpus.generated.ts
pnpm --filter @resonance/weave-os test
```

`corpus:check` runs as the first half of `build` and fails if the generated module has
drifted from the YAML, so an uncompiled edit cannot reach main. A test asserts the same
thing, so the fast gate catches it too. `src/corpus.generated.ts` is prettier-ignored —
it is compared byte-for-byte.

## The validator ships FAILING, on purpose

`weaveOsDiagnostics()` reports **seven errors** against
`corpus/active/emerging_creator_onboarding.yaml`: its `appliedPrinciples` names seven
principle ids — `expression_before_positioning`, `creator_sovereignty`,
`discovery_over_directive`, `low_cognitive_load`, `reflection_not_interpretation`,
`provisional_identity`, `relational_not_marketing_language` — that the principles file
does not define. Two vocabularies that do not meet.

**This is a decided requirement, not a bug to fix.** Do not map them to the nearest real
principle, do not invent the missing principles, and do not downgrade the field to
free-form tags. A test pins the exact seven; if the set changes, the test fails and a
human has to look. See `DEFECTS.md` § D-06.

Because the corpus ships with errors, `resolveWeaveOs` does not consult diagnostics and
does not throw on them — an unresolved reference means "a human owes this corpus an
answer", not "this corpus is unusable". Malformed _files_ are a different matter: they
fail the build.

## What is here vs. what is not

**Real:** the three transcribed documents (philosophy, principles, the emerging-creator
flow), the two promotion-target files, the registry rulebook, the compiler, the cross-file
validator, inheritance resolution, prompt composition, output collection, the release id.

**Empty by design, and that is correct:** `corpus/root/weave_behavior_rules.yaml` and
`corpus/root/weave_conversation_heuristics.yaml`. They are the two files the Pattern
Registry exists to fill through promotion. They hold the registry's pattern observations
as `state: inactive` records — addressable, promotable, carrying their registry id as
provenance, and never composed into a prompt. `corpus/root/modules/` is empty for the same
kind of reason: no specialised module has been authored, and `core`'s file union has no
body schema for one yet.

**Not here:** pattern and evidence _records_ (Postgres, via `@resonance/db`, seed
`resonance-e030`); the five Evolution Engine entities (out of scope, ADR-0020); the
job-scoped executor (ADR-0020 § 6, deferred to `resonance-bc11`); any member-side content.

## Tested

`src/weave-os.test.ts`, through the seam. The load-bearing assertions: the generated
module still matches the YAML; the validator fails on exactly those seven and on nothing
else; inactive records never reach a prompt; the machinery comes back typed; the release
id changes when any authored word changes or when authored keys are reordered.

## Working here (seeds + mulch)

Work in this package is tracked by a `weave-os`-labelled seed — `sd ready` / `sd search weave-os` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`weave-os`** mulch domain: `ml record weave-os --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
