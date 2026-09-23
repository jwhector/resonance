# ADR-0022: Creator onboarding — a product-owned staged runtime behind two versioned seams

- **Status:** Accepted — partly superseded 2026-09-22 (§§ 1, 3, 4, 5, 9, 12 by ADR-0023; see the note below)
- **Date:** 2026-09-13

> **Amendment (ADR-0023, 2026-09-22) — the "later Weave OS adapter" is designed, and it is not
> an adapter behind `CreatorOnboardingBehavior`.** The designer's runtime architecture (Figma
> "Resonance 9-21-26", page `2580:57143`) generates Weave's turn, extracts the creator's answer
> and decides the next stage with model calls, which invariant 8 of this seam forbids by design.
> ADR-0023 therefore answers the consume/retranscribe/replace fork with **consume**: a
> `weave-runtime` package executes the compiled corpus definition, superseding §§ 1 (the behaviour
> seam), 3, 4 (the closed version enum becomes a definition pin), 9 and 12. The product properties
> §§ 2, 6–8, 10 and 11 stand. § 5 ("structured state, never a transcript") is superseded as of
> 2026-09-23: the conversation history is kept; whether it survives completion is still open. `snapshot-v1` keeps running the product until the runtime passes the same
> conformance tests. See [ADR-0023](0023-weave-runtime-orchestrated-stage-workflow.md).

## Context

Creator onboarding today is a working vertical slice and not much more (ADR-0013). The
`/onboarding/creator` route is a free-form `useChat` transcript with a manual "Weave, build my
profile" button. Conversation and draft state live in the browser, so a reload loses the
interview. There is no stage machine, no named answers, no skip semantics, no generation
gating, no resume, and no designed completion state.

Discovery against the trusted `Resonance 9/10/26` Figma snapshot
([`creator-onboarding-discovery.md`](../../design/manifest/metadata/creator-onboarding-discovery.md))
established what the design actually asks for: an **eleven-stage emerging-creator interview**
ending in an editable profile foundation and an Onboarded rail. It classified all 68
`Onboarding/Creator/Interview` frames and all 51 `ProfileGen/Interview` frames, captured the
eleven distinct states as manifest screens 14–23 plus 06, and compared them against the
authored Weave OS corpus.

The product boundary was then narrowed deliberately. **In:** emerging creators, expression
style, an editable profile foundation, structured resumable session state, and Onboarded.
**Out:** the established-creator row, profile-image and cover-image generation, field-by-field
"Revise with Weave" refinement, Resonance Signal and evaluation collection, the Evolution
Engine, full transcript persistence, and any runtime dependency on `packages/weave-os`.

That last exclusion is the forcing constraint. ADR-0020 ratified the corpus, its resolver
seam, and its governance — but also that the corpus is **deliberately inert**: shipped,
validated, and wired to nothing. `packages/weave-os/corpus/active/emerging_creator_onboarding.yaml`
v1.1 broadly matches the Figma story, yet it carries documented source defects and diverges
materially at expression style (five adaptive options vs. Figma's three plus custom),
foundation candidate counts (three headline/About candidates and 5–10 tags vs. Figma's one set
and four tags), collaborative refinement, and completion behaviour.

So there is a real fork: consume the corpus now, retranscribe it, or hand-model the
snapshot-derived stages. And there is a real risk either way — that whatever interface we pick
becomes a shallow mirror of today's UI, leaving the next provider no room to differ.

## Decision

**Build a product-owned staged runtime for the approved MVP, behind two small versioned
interfaces in `@resonance/core`, and keep Weave OS a future adapter rather than a request-path
dependency.**

### 1. Two seams, not one

`packages/core/src/creator-onboarding.ts` defines both:

- **`CreatorOnboardingBehavior`** — what the creator is asked and what an answer means. A
  `version` plus four methods (`start`, `render`, `apply`, `acceptFoundation`), no I/O. Implemented by
  `@resonance/ai` as `snapshot-v1`.
- **`CreatorOnboardingSessionStore`** — how progress survives a reload. Three methods
  (`load`, `save`, `complete`). Implemented by `@resonance/db`.

They are separate because they vary independently: a later Weave OS adapter replaces
behaviour while persistence stays, and persistence can change without touching a stage rule.

### 2. The interface is semantic, not a mirror of the screens

The seam speaks stage render model, transition command, transition result, generation
request/result, and completion. It does **not** speak component props, Figma node names, or
CSS. `@resonance/ui` receives a `StageRenderModel` and renders any stage with one renderer
rather than eleven components, which is the test that the interface is semantic: a provider
that changed every question and every option would need no UI change.

### 3. Hand-model the snapshot stages now; do not consume the corpus

We implement the eleven Figma-derived stages directly and leave the corpus unread at runtime.
Consuming it today would couple the first usable release to unfinished governance and
evolution machinery and to a stage vocabulary that does not match the approved design.

Whether the later adapter consumes, retranscribes, or replaces parts of the corpus is
explicitly **not** decided here. It is decided once the MVP contract and its conformance
tests exist, which is the point at which the question can be answered with evidence.

### 4. Every session is pinned to a behaviour version

`CREATOR_ONBOARDING_BEHAVIOR_VERSIONS` is a **closed** enum (`snapshot-v1` today): a session
pinned to an unknown version fails to parse, and widening the enum plus an explicit migration is
the only way a new provider reads old sessions.

### 5. Structured state, never a transcript

The session stores named answer slots, statuses, the draft, the current stage, the behaviour
version and a revision, and has no field for prose; Weave's words live only on
`StageRenderModel`, derived per render.

### 6. Raw answers do not outlive the commit

`CreatorOnboardingSession` is a union on `status`, and the `completed` branch has no `slots` or
`draft` field, so post-commit cleanup is structural rather than remembered. Action payloads and
prompts carrying origin or resonance answers are never logged.

### 7. Writes are revision-checked and completion is idempotent

Every `TransitionCommand` carries `expectedRevision` and an `idempotencyKey`; the store alone
bumps the revision, and once a session is completed every later `complete`, whatever its key,
returns the existing completion with `alreadyCompleted: true`.

### 8. Identity is never client-supplied

`TransitionCommand` has no creator field and no behaviour version; identity arrives as a
separate server-resolved `CreatorOnboardingActor`, the same construction as `DiscoveryViewer`
(ADR-0017).

### 9. Only two stages gate generation

`CREATOR_ONBOARDING_GENERATION_REQUIRES` names `offering` and `intended_experience`, per the
corpus's minimum-information rule; every other stage is skippable, and Skip and "I want to do
it later" are real resumable transitions.

### 10. Unavailable capabilities are absent or honestly disabled, never dead

`revise_with_weave` and the composer's `+`/microphone are absent from the contract entirely,
while the completion rail's three unbuilt actions (`1443:78273`) are emitted `coming_soon` so
the renderer disables and labels them. A completed session still renders that rail and rejects
every action as `already_completed`; Finish for now is navigation, not a transition.

### 11. Public profile validation does not change

Generation, editing and commit reuse `CreatorProfileDraftSchema` and `CommitProfileInputSchema`
unchanged; tightening them toward the corpus's limits is a separate migration.

### 12. One use case runs the loop between the seams (amendment, 2026-09-14)

A `generate` or `commit` outcome is a request back to the caller, so something must sequence
apply → save → generate → accept → save, or apply → complete, on every request. That sequencing is
application logic and does not belong in the Next.js shell (ADR-0002). It lives in
`@resonance/ai` as `createCreatorOnboardingService({ behavior, store, generateFoundation,
newSessionId })`, with two methods: `open(actor)` and `transition(actor, command)`. The service
depends only on the two ports and a generator function, so replacing either adapter does not touch
it. It saves the answer that triggers generation before calling the model, and reports a lost save
race, a model failure and a replayed commit as explicit notices on the view it returns. The web
layer's one Server Action parses the command, resolves the actor and calls `transition`.

## Consequences

**Easier.** The interview becomes resumable and server-authoritative. `ui` renders eleven
captured states with one renderer. `ai` owns stage rules in one place with no model call needed
to decide what comes next, which makes the whole flow deterministically testable. Replacing the
provider later touches neither the UI, the routes, nor the schema. Privacy cleanup and
transcript-avoidance are properties of the types, so they cannot regress quietly.

**Harder.** There are now two contracts to keep honest, and a stage added to the design means a
core change before any UI work. Hand-modelling the stages accepts a **known, deliberate
divergence** from the authored corpus at expression style, foundation shape, refinement, and
completion — a debt to be paid when the adapter question is answered, not ignored. Version
pinning means a future provider cannot read today's sessions without an explicit migration,
which is the cost of refusing silent reinterpretation.

**Accepted.** The first release ships enumerated parity deltas rather than full design
fidelity: hidden composer and refinement controls, and three disabled Coming soon completion
actions. These are recorded as intentional deltas under ADR-0019, not defects.

**The diagram's shape does not change.** No package or external service is added, and no new
edge appears — `ai`, `db`, `ui`, and `web` already depend on `core`. What changed is what those
nodes are labelled with, so the two new seams are named the way `DiscoveryPort` already is
(ADR-0015). The `.drawio` source carries that; its generated `.svg`/`.png` still need a
regeneration pass on a machine with the `drawio` CLI.

**Revisit when** the Weave OS adapter is designed (the consume/retranscribe/replace fork), when
refinement or image generation gets a capability provider, when the established-creator path is
picked up, or when a newer registered Figma snapshot changes a captured hash — in which case
stop, reclassify the affected state, and revise rather than silently targeting stale pixels.

## Alternatives considered

**Wire `packages/weave-os` into onboarding now.** Rejected: the package is explicitly deferred
and inert (ADR-0020), its corpus has unresolved source defects, and its richer stage semantics
do not match the approved Figma MVP. It would couple the first usable release to unfinished
governance and evolution machinery.

**Keep the free-form chat and only restyle it.** Rejected: styling cannot produce deterministic
stage progress, required-input eligibility, explicit skip semantics, structured resume, version
pinning, or later provider conformance. The missing behaviour is the point of the work.

**Persist the full conversation transcript.** Rejected: the approved boundary is structured
state only. Prose enlarges the privacy and migration surface without being necessary either to
resume the interview or to generate the profile.

**Implement the full Figma and corpus refinement system in the first release.** Rejected: it
would fold a substantially larger preference-learning and regeneration system into the first
usable release. Direct editing makes a complete release on its own while refinement stays
behind a capability boundary.

**One combined port instead of two.** Rejected: behaviour and persistence vary independently,
and fusing them would force the future Weave OS adapter to reimplement storage it has no
opinion about.
