# ADR-0016: Agentic workflow — firstmate orchestration + knowledge ownership

- **Status:** Accepted
- **Date:** 2026-07-06

## Context

ADR-0014 defined the agentic context model in the abstract (Context / Recipes /
Guardrails / Tool access). We have now adopted a concrete external tool stack to
_operate_ it, layered on the **AXI** CLI-design substrate:

- **seeds** (`.seeds/`) — git-native planning: issues, decomposition, dependencies.
- **mulch** (`.mulch/`) — cross-session expertise, primed at every session start.
- **treehouse** — a reusable git-worktree pool for isolated agent runs.
- **firstmate** — orchestration: one "first mate" dispatches parallel crewmates.
- **no-mistakes** — a local push gate (review → test → docs → lint → PR → CI).
- **lavish** — HTML-artifact review with pinpoint human feedback.

This creates two decisions the abstract model didn't force. **(1)** More than one
orchestration model exists (parallel breadth vs. unattended depth) — we must pick a
default rather than run both. **(2)** With mulch and seeds added _alongside_ ADRs and
CLAUDE.md, four stores can now hold "knowledge"; without a rule, the same fact drifts
across them and primes bloat with restated decisions.

## Decision

**1. Orchestration: firstmate, one agent per package.** firstmate is the single
orchestration layer. Because package boundaries are context boundaries (ADR-0003),
they are also the parallelization boundary: **one crewmate ↔ one package ↔ one
treehouse worktree**. The unit loop is:

> seed → `ml prime` → worktree → firstmate crewmate → no-mistakes gate → lavish review → `ml record`

The seed id threads the whole loop and returns to mulch as an evidence anchor.
**gnhf** (unattended single-objective grinds) is deliberately **parked**; adopting it
later is a follow-up decision, not a default.

**2. Knowledge ownership — one fact, one home, separated by temperature.**

The four stores are divided by _how hot the knowledge is_ — how often it is read and
how cheaply it must be retrieved — not by topic:

| Store                      | Temperature                                        | Owns                                                                                                                                                         | Not for                                      |
| -------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| **mulch** (`.mulch/`)      | **Hot** — primed every session, scoped, structured | Agent-discovered operational knowledge (conventions, patterns, failures) **and `reference` records that index the ADRs by domain**. Domains mirror packages. | Restating an ADR's rationale.                |
| **CLAUDE.md** (root + pkg) | **Warm** — always loaded, curated                  | Stable, high-signal operating rules + pointers needed every session.                                                                                         | A decision log — it points to ADRs.          |
| **ADRs** (`docs/adr/`)     | **Cold** — read on demand, rarely, high-stakes     | The ratified decision, its _why_, and the alternatives rejected. Permanent, diagram-linked.                                                                  | The operative rule itself, or hot retrieval. |
| **seeds** (`.seeds/`)      | — (work, not knowledge)                            | Transient work: what to do, decomposition, dependencies, status.                                                                                             | Knowledge — it links to it.                  |

The rules:

- **A fact lives in exactly one store; the others link to it.**
- **An ADR holds the decision and its rationale, not the operative rule.** The
  operational extract ("embedding dims = 1024") lives once in the hot/warm layer and
  links back to the ADR for the _why_. Restating the rule inside the ADR — or in two
  hot stores — is the drift to avoid.
- **ADRs are not a retrieval layer.** They are not primed and cost tokens only when
  opened; mulch's job is to make opening one rare. A thin mulch `reference` record per
  domain surfaces _"there is a ratified decision here — open the ADR only if you are
  changing it"_ for a few tokens.
- A discovered convention → mulch; promote it to CLAUDE.md/ADR only once it hardens
  into a permanent rule, then delete the mulch copy. Work → seeds.

**3. Gate layering — don't validate the same change twice.** The on-save hook
(Prettier + ESLint + `tsc`) is fast local feedback; **no-mistakes** is the ship gate
(full review/test/PR/CI, scoped to Turbo-affected packages); `/code-review` folds into
the gate's review step rather than running standalone before it.

**4. Review surface.** **lavish** is the single artifact-review surface (plans, the
architecture diagram, Figma-derived UI) — chosen over the ad-hoc HTML/native artifact
path for its annotate-and-send-feedback loop.

## Consequences

- One orchestration reflex ("run the loop"), with no per-task mode decision and no
  second worktree mechanism to reconcile.
- **The hot path stays cheap.** Routine work reads primed mulch + always-loaded
  CLAUDE.md; ADRs are opened only when a decision is being _changed_, so their prose is
  a deliberate cost, not a per-session tax. `reference` records index them cheaply.
- Knowledge stops competing: agents know where to write and where to read, and
  `ml prime` output stays high-signal instead of echoing ADRs.
- **Worktree-safe by construction:** `.gitattributes` sets `merge=union` on the mulch
  and seeds JSONL, so parallel crewmates append memory and issues without conflicts.
- Requires discipline: promote a hardened mulch learning to CLAUDE.md/ADR (and remove
  the duplicate); when an ADR changes the system's shape, update the diagram (ADR-0015).
- This is **dev-time workflow tooling, not runtime architecture** — the product
  architecture diagram is unaffected by this ADR.
- `gnhf` stays available on the shelf; a depth-first unattended grind can be adopted
  later without disturbing this loop.

## Alternatives considered

- **Run firstmate _and_ gnhf as peer modes:** forces a mode decision every task and
  two worktree mechanisms to reconcile. Parked gnhf instead.
- **Let ADRs / CLAUDE.md / mulch overlap freely:** predictable drift and contradiction;
  primes bloat with restated decisions.
- **Collapse the ADRs into mulch `decision` records:** rejected — permanence, the
  alternatives narrative, and PR-auditable immutable history need markdown-in-git, not
  a decay-and-prune record store. mulch is a young tool and a "dumb container"; a
  ratified constraint must not be prunable as "stale."
- **Make no-mistakes replace the on-save hook or CI:** loses fast local feedback;
  layering the three is cheaper and each catches a different class of problem.
- **Keep the native/ad-hoc HTML artifact path for review:** no pinpoint feedback loop;
  lavish was chosen for the interaction, not just the rendering.
