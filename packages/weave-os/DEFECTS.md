# Weave OS corpus — defect log

Everything found while transcribing the five design documents into
`packages/weave-os/corpus/`. **Nothing on this list was silently corrected.** Where a
source document does not determine an answer, the transcription carries what was written
and records the question here for the designer, rather than inventing a semantics.

Source documents (read-only, never edited — see `.prettierignore`):

| Ref  | Document                                                    |
| ---- | ----------------------------------------------------------- |
| PHIL | `docs/Weave Interaction Philosophy.md` (v1.2)               |
| PRIN | `docs/Weave Interaction Principles.md` (no version)         |
| FLOW | `docs/Emerging Creator Onboarding Interview Flow.md` (v1.1) |
| REG  | `docs/Weave Pattern Registry.md` (v1.1)                     |
| ENG  | `docs/Weave Evolution Engine Architecture.md`               |

**Severity** — `blocking`: the corpus cannot be correct until it is answered.
`question`: the transcription made a defensible choice that the designer should confirm.
`typo`: cosmetic, carried verbatim.

---

## D-06 · `applied_principles` names seven principles that do not exist · **blocking**

FLOW lines 60–67 declare:

```
applied_principles:
  - expression_before_positioning
  - creator_sovereignty
  - discovery_over_directive
  - low_cognitive_load
  - reflection_not_interpretation
  - provisional_identity
  - relational_not_marketing_language
```

PRIN defines seven entirely different principles: Support Heart, Support Becoming,
Support Discovery, Support Safety, Support Clarity, Support Experiment, Support
Intuition. **None of the seven names above resolves.** These are two vocabularies for
what is presumably the same idea, and they do not meet anywhere in the five documents.

**The cross-file validator fails on all seven, by name, on every build and every test
run.** That is deliberate and is pinned by a test. They were not mapped to the nearest
real principle, no missing principles were invented, and the field was not downgraded to
free-form tags — any of those would author the designer's semantics on their behalf,
which is the exact drift the corpus's provenance rules exist to prevent.

**What is needed from the designer:** either a mapping from each of the seven names to
one or more of the authored principles, or seven new principle records, or a statement
that `applied_principles` means something other than "principle ids".

Until then the composed prompt still carries all seven authored principles, because the
flow inherits `weave_interaction_principles.yaml`; `applied_principles` narrows nothing.

---

## D-01 · PHIL: `source_of_truth:` is written twice · question

PHIL lines 247–248 repeat the key on consecutive lines, the second nested under the
first. The duplicate carries no content. Transcribed once; the body is unchanged.

## D-02 · PHIL: a garbled belief · **blocking**

PHIL line 233, under `expression_philosophy.beliefs`:

> Stories carry emotions, clarify emotions serve creators.

The sentence is not recoverable. It is carried **verbatim** into
`blocks.expression_philosophy.beliefs` and therefore reaches the composed prompt as
written. **The intent was not guessed at.** The designer needs to restate it.

## D-03 · REG: the first key is `ile:` · typo

REG line 6 reads `ile:` — the `f` of `file:` was consumed by the document's bold markup.
Read as `file:`.

## D-04 · PRIN: the document has no metadata block at all · question

Every other source document opens with `file:` or `metadata:` giving a version, status,
type and (for PHIL) an evolution policy. PRIN has none: no version, no status, no author,
no date, no inheritance, no evolution policy.

`version: "1.0"` and `status: in_progress` in
`corpus/root/weave_interaction_principles.yaml` are **PROVISIONAL values assigned by
transcription** so the file could satisfy the schema. They are not the designer's.
`inherits: [weave_interaction_philosophy]` is taken from PHIL's own `inherited_by` list.

The principles file is the second-most-protected file in CODEOWNERS. It should not be
carrying a version nobody chose.

## D-05 · REG: the registry disagrees with itself about where it lives · question

ENG § 6 says `evolution/registry/weave_pattern_registry.yaml`; REG's own
`architecture.recommended_path` says `evolution/weave_pattern_registry.yaml`. Neither is
used — CODEOWNERS fixes the path at `packages/weave-os/corpus/registry/` (ADR-0020). The
authored `recommended_path` is carried verbatim under `guidance.architecture`.

## D-07 · FLOW: six of seven optional-branch targets are undefined · question

`flow_map.optional_branches` leads to `deferred_naming_support`, `softer_question`,
`grounded_examples`, `skip_option`, `quick_path` and `reflective_follow_up`. None is a
stage, and none is defined anywhere else in the corpus. Only
`collaborative_refinement` resolves.

`@resonance/core` records that a branch target is a flow-local _response direction_ and
need not name a stage, so the validator reports these as **warnings**, not errors. They
are still six names with no definition.

## D-08 · REG: patterns are observations, not directives · question

`BehaviorRule` requires `directive: do | avoid`. The registry states each pattern as an
observation ("Refinement choices reveal temporary … preferences"), not as an instruction.
Every seeded behaviour rule in `corpus/root/weave_behavior_rules.yaml` carries
`directive: do` and the registry's `observation` text verbatim as its `statement`.

**`directive` was assigned by transcription.** The records are `state: inactive`, so
nothing reaches a prompt, but promoting one means rewriting its statement as a real
directive — that is the designer's sentence to write, not ours.

## D-09 · FLOW: `creator_name_status: unknown` is not a declared value · question

`session_state.collected.creator_name_status` starts at `unknown`. The `creator_name`
capture declares exactly four values for `status`: `confirmed`, `provisional`,
`wants_support`, `skipped`. `unknown` is none of them. Both carried as written.

## D-10 · FLOW: `origin_story` vs `origin` · question

`session_state.collected` holds `origin_story`; the stage and its capture are both called
`origin`. Nothing else in the flow uses `origin_story`. Both carried as written.

## D-11 · The heuristics file has two names · question

PHIL's `architecture.inherited_by` names `conversation_heuristics.yaml`; ENG § 4 names
`weave_conversation_heuristics.yaml`. The corpus uses the ENG spelling, because CODEOWNERS
already encodes that path and ADR-0020 requires the two to change together.

The cross-file validator reports the disagreement automatically, as an
`inheritance_view_divergence` warning against the philosophy.

## D-12 · FLOW: `captures:` blocks are authored at least three incompatible ways · question

`FlowCapture.fields` maps a field name to `{ values?, shape? }`. The eight authored
captures do not agree on what the keys under a capture mean. Each needed a per-case
judgment:

| Stage / capture                                   | How it is authored                                                                         | How it was transcribed                                                                                                                                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `opening` / `depth_mode` **(D-12a)**              | **meta keys**: `type: enum`, `values: [...]` describing one scalar                         | one field named `value` holding the value set. `type: enum` dropped — a non-empty `values` already closes the set. The field name `value` is borrowed from the author's own `creator_name` capture.                                          |
| `creator_or_project_name` / `creator_name`        | **data keys**: `value: string \| null`, `status: [...]`                                    | fields `value` (`shape: "string \| null"`) and `status` (`values`). Clean.                                                                                                                                                                   |
| `what_they_want_to_share` / `offering_expression` | data keys with informal type notes                                                         | `raw_response`/`confirmed_summary` as `shape`, `certainty` as `values`. Clean.                                                                                                                                                               |
| `origin` / `origin` **(D-12b)**                   | `usable_elements` is plural but declares a closed set                                      | `values`. The source does not say whether one element or several are recorded.                                                                                                                                                               |
| `intended_experience` **(D-12c)**                 | `experience_terms: []` — a bare empty list                                                 | `values: []` (which the schema reads as "free form") plus `shape: "[]"` carrying the author's literal token, so the ambiguity stays visible. Same treatment for `resonant_people.people_or_contexts` and `expression_style.selected_labels`. |
| `expression_style` **(D-12d)**                    | `creator_description: null` — an initial **value**, where siblings declare a type or a set | `shape: "null"`, carrying the author's literal token.                                                                                                                                                                                        |
| `resonance_moment`, `resonant_people`             | data keys                                                                                  | clean.                                                                                                                                                                                                                                       |

**The unresolved question is what a key under a capture denotes** — a sub-field, a type
annotation, or an initial value. The documents use all three.

## D-13 · FLOW: actions are authored two ways · question

`opening` writes actions as objects with a creator-facing label
(`{ id: begin, label: "Yes, I'm ready" }`). `creator_or_project_name`, `expression_style`,
`foundation_generation`, `collaborative_refinement` and `completion` write bare ids
(`- continue_with_this_name`). `@resonance/core`'s note says transcription adds the
missing label; **no labels were invented** — inventing creator-facing copy is exactly what
transcription must not do. Those actions carry an id and no label.

## D-14 · FLOW: `recommended_length_characters` is modelled as a hard bound · question

`profile_headline.constraints.recommended_length_characters: { minimum: 50, maximum: 100 }`
becomes `constraints.characterCount`, which the generator validates against. The
"recommended" nuance — whether 110 characters is a failure or a preference — is not
expressible and is lost.

## D-15 · FLOW: `foundability_feedback` omits `creator_can_correct` · question

Its two sibling supporting outputs both set `creator_can_correct: true`. This one sets
`public`, `used_for_generation` and `show_during_review` and stops. The schema default
(`true`) applies. The source does not say whether that is intended for a diagnostic
output the creator did not write.

## D-16 · FLOW: `completion_data` nests deeper than a capture allows · question

`completion_data.accepted_outputs` is a map of maps (`creator_name: boolean`, …), one
level deeper than `FlowCapture.fields` permits. The block is capture-shaped but was
carried whole into the `completion` stage's `guidance` rather than split across a capture
and a guidance block.

## D-17 · The two promotion-target files reach no conversation · **blocking**

ENG § 4 says `weave_behavior_rules.yaml` and `weave_conversation_heuristics.yaml` are
"inherited by relevant active files". **No active file inherits either.** FLOW declares
`inherits: [root/weave_interaction_philosophy.yaml, root/weave_interaction_principles.yaml]`
and nothing else.

Inheritance is stored child-side (ADR-0020 § 5), so a promotion into either file changes
nothing until a flow names it. The flow's `inherits` list was **not** edited to add them —
that is the designer's declaration, not ours. The validator reports both as
`uninherited_root_file` warnings.

## D-18 · Neither promotion-target file was ever delivered · question

PHIL and ENG both refer to `weave_behavior_rules.yaml` and the heuristics file, and ENG
§ 4 describes their purpose, but no such documents exist in the five sources. They are
**authored here**, empty apart from the inactive registry seeds, with versions and
statuses chosen by us (see the header comment in each). Same caveat as D-04.

## D-19 · FLOW: `creator_name_recommendations` is declared but never produced · question

`profile_foundation.optional_outputs` lists `creator_name_recommendations`. No output with
that id exists anywhere in the flow; `foundation_generation` produces `creator_name` with
`candidate_count: 3`. Presumably the same thing under two names.

## D-20 · REG: the registry's stage vocabulary is not the flow's · question

Patterns record `scope.discovered_in.stages` as `creator_name`, `offering_expression`,
`output_review`, `refinement`, `profile_headline`, `about_generation`. The flow's stages
are `creator_or_project_name`, `what_they_want_to_share`, `foundation_generation`,
`collaborative_refinement`, …. **None of the six matches a stage id.** Some match capture
or output ids instead.

This affects `@resonance/db` (seed `resonance-e030`), which stores the pattern records: a
foreign key from a pattern to a stage cannot be built until the two vocabularies agree.

## D-21 · REG: ten patterns, not nine · question

REG defines ten patterns: `creator_uncertain`, `creator_gives_short_answer`,
`creator_becomes_reflective`, `creator_wants_speed`, `creator_dislikes_output`,
`revision_direction_matches_output`, `generated_identity_is_provisional`,
`creator_rejects_output_without_reason`, `tone_request_hides_meaning_mismatch`,
`gradual_preference_learning`. The registry is internally consistent at ten. This entry
exists only because the **task brief** given to this transcription said nine — the
discrepancy is in that brief, not in REG, and should not be read as a defect in the
designer's document.

Two of them — `creator_dislikes_output` and `gradual_preference_learning` — name **both**
`behavior_rule` and `conversation_heuristic` as candidate promotions, so they are seeded
into both files. That is the registry's own classification, not duplication; neither
destination has been decided (`promotion.recommended_target: null` for all ten).

`gradual_preference_learning` describes per-creator **runtime** memory — "remember
confirmed preferences", "preserve context and timestamp", "allow preferences to change" —
which is a different mechanism from the OS evolution the registry governs. It is seeded as
an inactive record like the other nine; no preference-learning machinery is built for it
here.

`revision_direction_matches_output` also names `interview_pattern` as a candidate. There
is no typed home for a flow-local pattern in an interview flow file, so it was seeded only
into `weave_behavior_rules.yaml`.

## D-22 · Three different things share the ids `creator_name` and `expression_style` · question

`creator_name` is a capture id and an output id. `expression_style` is a stage id, a
capture id **and** an output id. Nothing breaks — the three live in separate namespaces —
but a promotion action naming `expression_style` is ambiguous about which one it means.

## D-23 · ENG describes six active flows; one was delivered · question

ENG § 5 specifies `emerging_creator_onboarding`, `existing_creator_onboarding`,
`offering_title_description`, `price_range_interview`, `profile_image_generation` and
`cover_image_generation`. Only the first has a source document. The registry's patterns
reference three of the missing five in `scope.discovered_in.flows`
(`offering_title_and_description`, `logo_generation`, `cover_image_generation`) — and note
that two of those spellings differ from ENG's (`offering_title_and_description` vs
`offering_title_description`, `logo_generation` vs `profile_image_generation`).

## D-24 · PHIL: `metadata.last updated: 7/14/26` is an ambiguous date · question

Transcribed as `2026-07-14`, reading it as US `M/D/YY`. The schema requires ISO.

## D-25 · Small language defects, carried verbatim · typo

Transcribed exactly as written; none was corrected, because the composed prompt must be a
diff of the governed file.

- PHIL `core_beliefs`: "Identity can change anytime" and "Identity grow with creativity"
  (no full stop; subject–verb disagreement).
- PHIL `learning_philosophy`: "Asking questions often lead to better understanding."
- PHIL `world_view.humanity`: "Creativity is a conscious action, creating better future
  for oneself and others." and "Technology support humans uncover and connect with
  intuition."
- PRIN: list items are lower-case under Support Heart / Becoming / Safety / Clarity /
  Experiment, and capitalised under Support Discovery / Intuition. `Over-polishing` is
  capitalised mid-list under Support Clarity.
- FLOW `resonance_moment.weighting`: the values `normal`, `low_for_identity_generation`
  and `exploratory` are an undefined vocabulary used nowhere else.

---

## Transcription notes (not defects)

These are choices the transcription made that a reviewer should know about, but which the
sources do determine.

- **Key naming.** Keys the schemas model use the schema's camelCase names
  (`appliedPrinciples`, `flowMap`, `evolutionPolicy`); keys the author invented keep the
  author's snake_case verbatim (`core_beliefs`, `response_paths`, `raw_response`). There is
  no key-mapping layer — the YAML is parsed straight into the Zod schemas, so the file a
  reviewer reads is the object the resolver holds.
- **Inheritance direction.** PHIL writes inheritance parent-side
  (`architecture.inherited_by`); the corpus stores it child-side only (`inherits`), per
  ADR-0020 § 5. The authored parent-side list is carried under `blocks.architecture` for
  the reader and is compared against the real edges by the validator (see D-11).
- **`weave` versus `guidance`.** A stage's `weave` map holds the utterances the author
  placed under a `weave:` key — including `collaborative_refinement`'s nested
  `entry.weave` — plus `completion`'s `publish_response` and `save_draft_response`, which
  are unambiguously Weave's spoken copy. Copy nested inside branching machinery
  (`response_paths.creator_is_unsure.response`, `follow_up.prompt`) stays with its
  machinery in `guidance`, so the condition it belongs to is not lost.
- **Output guardrails.** `foundability_feedback.guardrails` became
  `constraints.rules` verbatim rather than `constraints.avoid`, because the author's own
  tokens already read `do_not_…` and putting them under `avoid` would double the negative.
- **The registry split.** Only the rulebook half of REG is in the corpus. Patterns,
  evidence, confidence, contradictions and test history are Postgres rows (ADR-0020 § 4,
  seed `resonance-e030`). REG's `entity_access` block is carried but not implemented — the
  five engine entities are out of scope for this slice.
- **YAML typing.** The corpus is parsed with YAML's JSON schema rather than its default
  one, so `2026-07-14` stays a string and `no` stays the word "no". Version numbers are
  quoted for the same reason.
