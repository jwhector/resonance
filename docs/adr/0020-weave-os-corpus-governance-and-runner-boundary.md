# ADR-0020: Weave OS — repo-versioned corpus behind a resolver seam, git-native governance, and the request/job-scoped runner boundary

- **Status:** Accepted
- **Date:** 2026-07-28

## Context

The designer delivered five specs describing **Weave OS** — a versioned behavioral
system for Weave plus an **Evolution Engine** that observes it, gathers evidence, and
proposes changes to itself under human approval:

- [`docs/Weave Interaction Philosophy.md`](../Weave%20Interaction%20Philosophy.md) (v1.2)
- [`docs/Weave Interaction Principles.md`](../Weave%20Interaction%20Principles.md)
- [`docs/Emerging Creator Onboarding Interview Flow.md`](../Emerging%20Creator%20Onboarding%20Interview%20Flow.md) (v1.1)
- [`docs/Weave Pattern Registry.md`](../Weave%20Pattern%20Registry.md)
- [`docs/Weave Evolution Engine Architecture.md`](../Weave%20Evolution%20Engine%20Architecture.md)

The codebase can host none of it. Weave's behavior today is two TypeScript string
literals — `CREATOR_INTERVIEW_SYSTEM` (`packages/ai/src/agents/creator-interview/prompt.ts`)
and `PROFILE_GEN_SYSTEM` (`packages/ai/src/agents/profile-gen/prompt.ts`) — with no
version, no structure, no provenance, and no relationship to the philosophy and
principles the specs define.

The specs also propose their own **infrastructure**: a standalone `weave-evolution-engine/`
repository (§18), a file-safety and access model (§16), and a versioning/release/audit
model (§17). Those parts collide with decisions this repo has already ratified —
package boundaries (ADR-0003), no domain logic in the app shell (ADR-0002), the git +
PR + no-mistakes gate (ADR-0016). Adopting the specs verbatim would fork the toolchain
and rebuild machinery we already have.

This ADR ratifies the architecture for the **foundation slice** (seeds plan `pl-9c75`):
the corpus, its seam, its governance, and the execution boundary the Evolution Engine
will need. The five engine entities (Evaluator, Researcher, Architect, Validator,
Evolution Manager) are deliberately **out of scope** — designing them before the corpus
and evidence shapes exist would guarantee rework.

Throughout: **the codebase's architecture takes precedence over the specs' proposed
structure, and the specs' paths are placeholders.** Each decision below names where it
overrides the specs and on what grounds. The specs' _content_ — philosophy, principles,
flow, patterns — is authoritative and is not being renegotiated here.

## Decision

### 1. The corpus is repo-versioned YAML, compiled at build

The Weave OS corpus is authored as **YAML files in a new `@resonance/weave-os` package**,
schema-validated and compiled into **typed frozen objects at build time**. There are
**no runtime filesystem reads**: the corpus ships as code, so a malformed file fails the
build rather than a request, and nothing depends on file layout surviving Vercel's
bundler. Business logic stays in `packages/*` (ADR-0002); the package is a boundary
(ADR-0003).

**Overrides the spec:** §18's standalone `weave-evolution-engine/` repository tree. A
second repo conflicts with ADR-0003 and would fork the toolchain, test pyramid, and CI
for no gain. The spec's `weave_os/root/`, `weave_os/active/`, and `evolution/registry/`
paths are honored as **structure inside the package**, not as a repository root.

### 2. The resolver is the seam, and it returns four things

The package's public entrypoint is one function:

```
resolveWeaveOs({ flow, context }) → { system, flow, outputs, releaseId }
```

A small interface over a large implementation — parse, validate, resolve inheritance,
route, activate, compose, stamp (ADR-0017). It returns four things because the corpus
holds three different **kinds** of content, which are consumed at different times by
different callers:

- **Guidance and copy** (philosophy, principles, stage intent) compose into `system` —
  the prompt the runtime uses today.
- **Machinery** — `flow_map`, `optional_branches`, `session_state`, per-stage `captures`
  and `actions` — is parsed, typed, and validated into `flow`, but is deliberately **not
  consumed** by the current free-form conversational runtime.
- **Output constraints** (candidate counts, length bounds, `should_express` / `avoid`
  lists) become `outputs`, which validates generation.

`releaseId` stamps which corpus release produced a given conversation.

Collapsing these into a single composed system prompt string would be a **shallow
interface over a deep problem** (ADR-0017): it silently discards the machinery half of
the active file and forces a second parse elsewhere. The measurable gap between what the
corpus specifies and what the runtime implements is a deliberate, tracked artifact — it
is precisely what a future Evaluator scores against. **Typing the machinery is in scope;
executing it is not** — consuming `flow` would be an interview rebuild, not a foundation.

### 3. Governance is git, plus exactly two additions

Evolution Engine §16's file-safety rules — approved and candidate files stay separate,
every candidate carries a visible diff, every applied change records human approval, no
entity approves its own proposal, rejected evidence is preserved — are **already provided**
by git branches, pull requests, and the no-mistakes gate (ADR-0016). §17's versioning
model (file version, release version, approval record, applied date, rollback reference)
is provided by **commits and tags**. We build **neither**. A candidate change to Weave's
behavior is a pull request against the corpus; approval is a review; rollback is a revert.

Git cannot express two things, so we add exactly those two:

**(a) `CODEOWNERS`** at the repo root encodes §15's five approval tiers — flow-local
change, behavior rule, conversation heuristic, interaction principle or philosophy, new
specialized root module — as required reviewers per corpus path. This is the _who_.

**(b) Machine-readable consumption of each file's authored `evolution_policy` block.**
Every root file carries one; it declares `architect_access`, `direct_modification`,
`validation_required`, `human_approval_required`, `change_threshold`, and — critically —
`acceptable_reasons` and `unacceptable_reasons`. This is the _why_, and it is not
decoration. The Philosophy file's `unacceptable_reasons` rule out **"temporary performance
improvement," "easier implementation," and "stylistic preference"** as grounds for
changing the foundation. In a system explicitly designed to modify itself from its own
metrics, that list is the **anti-Goodhart guardrail**: it is the one thing standing between
a score-optimizing agent loop and the gradual erosion of the philosophy the scores were
supposed to serve. A guardrail against optimization pressure cannot itself be enforced by
good intentions — **it must be parsed and checked in code, not honored in prose.**

**Overrides the spec:** §16 and §17 as buildable subsystems. Their _requirements_ are met;
their _implementations_ are not built, because git already implements them and a
second, weaker copy would be the thing that drifts.

### 4. The Pattern Registry splits in two

The Pattern Registry spec mixes two things with different lifecycles, so it lands in two
places:

| Half                                                                                      | Home                               | Why                                                                      |
| ----------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------ |
| **Rulebook** — promotion destinations, thresholds, `metric_definitions`, `pattern_schema` | Repo YAML in `@resonance/weave-os` | Stable config, changes by review, governed like the rest of the corpus   |
| **Records** — patterns, evidence, confidence, contradictions, test history                | Postgres via `@resonance/db`       | Accumulates, is queried, links to observations by foreign key — app data |

This satisfies the registry's **own** declared constraint (`authority.inherited_by_runtime:
false`, `executable: false`) — records are addressable and promotable but are never
inherited into a runtime prompt — and the repo rule that all reads and writes go through
`@resonance/db` (ADR-0004). Promotion produces a **pull request against the corpus**, which
is exactly where §16's governance needs to bite.

**This split is our synthesis, not the designer's stated design.** The spec describes one
`weave_pattern_registry.yaml` holding both halves. If a single hand-editable file turns out
to be a requirement rather than an artifact of authoring in a doc, this needs renegotiation
before the `@resonance/db` step lands.

### 5. Inheritance is normalized child-side

The specs write inheritance in both directions: **parent-side** in the Philosophy file
(`architecture.inherited_by` listing principles, behavior rules, heuristics, `active/*`)
and **child-side** in the flow file (`inherits: [root/weave_interaction_philosophy.yaml, …]`).
The corpus stores the edge **child-side only**; `inherited_by` becomes a **derived view**
rendered from the child edges.

The reason is governance, not taste: storing the edge parent-side means **every new root or
active file requires an edit to the most-protected file in the system** — the Philosophy
file carries `change_threshold: exceptional` and demands founder-level approval. Adding a
flow would then trip the philosophy tier for a purely mechanical reason, which is exactly
the kind of change its own `unacceptable_reasons` disallow. Child-side storage keeps the
designer's mental model intact (both directions remain readable) while keeping routine
additions in the routine tier.

**Overrides the spec:** the redundant parent-side list is not a second source of truth. If
the two ever disagree, the child edge wins and validation reports the divergence.

### 6. Request-scoped runner vs. job-scoped executor

**ADR-0009's "one shared runner" stays as-is and is correct — for request-time product
agents.** It is not being superseded, narrowed in ambition, or reopened. What this ADR adds
is a **boundary**: that runner is request-scoped, and the Evolution Engine is not a request.

The limitation is structural and visible in `packages/ai/src/runner.ts`:

- `runAgentStream` returns a `StreamTextResult` — an HTTP stream a route handler pipes to
  a browser. Its lifetime is a request.
- `runAgentStructured` is hard-capped at `stopWhen: stepCountIs(1)`: force exactly one tool
  call, execute it, stop. It also throws a typed `AgentError` on any failure — correct
  fail-fast behavior for a user-facing generation.

Neither can drive a multi-turn agentic loop, and neither should be made to.

The Evolution Engine needs a **job-scoped executor**: multi-step Architect reasoning over
many turns; a **human-in-the-loop pause spanning days** (§13 step 12, "Decide"); fan-out
across test cases and personas; **resume without re-billing** completed model calls; and
**record-and-continue** partial-failure semantics — a failed test case is evidence, not an
aborted run — rather than the runner's fail-fast throw.

ADR-0009 anticipated this precisely, in its **"When to revisit (add Vercel Workflow / WDK)"**
section. The engine trips **three of its five named triggers**:

- **#2** — re-running the whole job on failure is expensive/wrong; you want resume-from-step
  so completed LLM calls aren't repeated and re-billed.
- **#4** — a human-in-the-loop pause (generate → await approval → apply).
- **#5** — fan-out/fan-in (run N cases in parallel, then compare).

**This ADR records the boundary and the tripped triggers. It deliberately does not design
the executor.** Designing it now — before the engine's shape is known — repeats the exact
"designing blind" failure this plan avoided by deferring the five engine entities. The
first real instance arrives in seed `resonance-bc11`: the simulated-run harness's multi-turn
conversation driver, which the harness genuinely requires for its own sake. That is the
intended **design spike**; the executor's shape gets ratified after it exists, not before.

**Explicitly rejected: bolting a third `runAgentLoop` entry point onto `runner.ts`.** It
would put a request-scoped streaming path, a one-shot structured path, and a durable
multi-day job behind one interface at two different altitudes — a shallow interface whose
callers must learn which of three incompatible lifetimes they are buying (ADR-0017).

## Consequences

- **Weave's behavior becomes reviewable.** A change to what Weave says is a diff in a YAML
  file with a version, an author, provenance, and a named approver — not an edit to a string
  literal.
- **Malformed corpus fails the build, not a conversation.** Compile-time validation moves
  the whole class of "the prompt file was wrong" out of production.
- **Governance costs one file, not a subsystem.** `CODEOWNERS` plus `evolution_policy`
  parsing is the entire governance implementation; git supplies the rest. The cost accepted
  is that approval tiers are only as strong as branch protection makes them — CODEOWNERS is
  advisory until required reviews are enabled on the default branch.
- **CODEOWNERS is last-match-wins.** GitHub applies only the last matching pattern to a
  path, and it cannot express "any two of these three." A tier's required reviewers must
  therefore all appear on the **one** pattern that matches, and quorum-style rules from §15
  degrade to "all listed owners." Ordering in the file is load-bearing: broader corpus
  patterns come first, the most-protected paths last.
- **CODEOWNERS defines the corpus layout.** Its path patterns are written before the corpus
  exists; the `@resonance/weave-os` step must adopt them, or update both together.
- **A tracked gap between spec and runtime.** The flow machinery is typed and validated but
  unexecuted. This is intentional and is the Evaluator's future scoring target — but it is a
  gap, and it will look like an omission to anyone reading the corpus without this ADR.
- **The registry split is unratified with the designer.** Recorded here as our synthesis
  (§4 above); it may need renegotiation.
- **ADR-0009 is amended, not superseded** — its runner decision stands; a scope note and a
  pointer here were added.
- **ADR-0016's knowledge-ownership model gains a fourth store** — the corpus. See the
  amendment there for what belongs in it.
- **The architecture diagram is not updated by this ADR.** It changes shape (two new
  packages, corpus and observation data flows) only once the packages exist; that is seed
  `resonance-8b0c` (ADR-0015).
- **Revisit trigger for §6:** when the job-scoped executor's shape is known — after
  `resonance-bc11` — ratify it in its own ADR, including whether it is Vercel Workflow/WDK
  or something smaller. Do not let it accrete inside `@resonance/ai` in the meantime.

## Alternatives considered

- **Corpus in Postgres with an in-app approval UI.** Lets non-engineers approve without a
  PR, but rebuilds versioning, diffing, candidate separation, and approval from scratch when
  git already provides all four. Revisit only if non-engineer authorship becomes a hard
  blocker.
- **Runtime YAML reads from the filesystem, as §18's tree implies.** Loses build-time
  validation, is fragile under Vercel bundling, and pushes parse cost into every request.
- **Resolver returns a single composed system prompt string.** Simplest interface, but it
  discards the machinery half of the active file and forces a second parse elsewhere — a
  shallow interface over a deep problem (ADR-0017).
- **A standalone `weave-evolution-engine` repository per §18.** Conflicts with ADR-0003 and
  forks the toolchain, test pyramid, and CI.
- **Build §16/§17's file-safety and versioning subsystems as specified.** Rejected: a
  second, weaker implementation of branches, diffs, approvals, and rollback, sitting next to
  git. The specs' requirements are met by mapping them onto git, not by re-implementing them.
- **Treat `evolution_policy` as documentation.** Rejected: `unacceptable_reasons` is the
  guardrail against a self-modifying system optimizing away its own foundation. A guardrail
  that is only prose is not a guardrail.
- **Store inheritance parent-side, matching the Philosophy file.** Rejected: it makes every
  new root or active file an edit to a `change_threshold: exceptional` file.
- **One Pattern Registry file holding both rulebook and records.** Matches the spec, but
  puts accumulating, foreign-keyed, queried data in a YAML file and outside `@resonance/db`.
- **Add a third `runAgentLoop` entry point to the shared runner.** Rejected: conflates
  request-scoped and job-scoped execution behind one interface (§6 above).
- **Design the job-scoped executor in this slice.** Rejected: it would be designed against
  an engine that does not exist — the same "designing blind" failure that deferring the five
  engine entities avoided.
- **Build the five engine entities now.** Rejected: they would be designed against a corpus
  and evidence shape that does not exist yet. Deferred to a follow-on plan.
