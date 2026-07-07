# ADR-0017: Design deep modules

- **Status:** Accepted
- **Date:** 2026-07-07

## Context

Resonance already leans hard on one shape: a lot of behaviour hidden behind a small,
stable surface. `@resonance/db` exposes a few query helpers over Drizzle + pgvector +
the Neon/PGlite duality; ports (`MailPort`, `StoragePort`, `PaymentsPort`) hide a
provider behind an interface; every package presents a single `src/index.ts` and hides
its internals (ADR-0003). But we have been doing this **implicitly**, with no shared
vocabulary and no explicit criterion for _how much_ a surface should hide. Two costs
follow:

1. **Design drift.** Agents (and humans) designing a package interface, a port, a query
   helper, or a component's props reach for whatever words come to mind — "component,"
   "service," "API," "layer." Inconsistent language makes design intent unreviewable and
   uncomparable across the codebase.
2. **No depth criterion.** Nothing names the failure mode of a **shallow** module — an
   interface nearly as complex as the implementation behind it, a pass-through that only
   adds surface. So reviews can't flag it, and planning can't design against it.

A design tenet — "deep modules," in the sense of John Ousterhout's _A Philosophy of
Software Design_ and Michael Feathers' _seam_ — was drafted into
[`.claude/skills/module-design/SKILL.md`](../../.claude/skills/module-design/SKILL.md)
with a **provisional** mapping to Resonance. This ADR ratifies that mapping so the
vocabulary and the depth criterion become the shared, enforceable standard. This is
**formalization + vocabulary unification**, not new architecture — it names what the
codebase already does and makes _depth_ an explicit design and review criterion.

## Decision

Adopt **deep-module design** as a first-class, named tenet, using one exact vocabulary
everywhere design happens or is reviewed. A **deep module** is a lot of behaviour behind
a **small interface**, placed at a clean **seam**, testable through that interface.

### The vocabulary (use these terms; don't substitute)

- **Module** — anything with an interface and an implementation; scale-agnostic (a
  function, a class, a package, a tier-spanning slice). Not "component/service/unit."
- **Interface** — everything a caller must know to use the module correctly: the type
  signature _and_ its invariants, ordering constraints, error modes, required config,
  and performance characteristics. Broader than "API/signature."
- **Implementation** — the code inside the module.
- **Depth** — leverage at the interface: how much behaviour a caller (or test) exercises
  per unit of interface it must learn. Deep = small interface over large implementation;
  **shallow** = interface nearly as complex as implementation (avoid — it just adds
  surface).
- **Seam** (Feathers) — a place you can alter behaviour without editing there; the
  location at which a module's interface lives. _Where_ the seam goes is its own design
  decision, distinct from _what_ sits behind it.
- **Adapter** — a concrete thing that satisfies an interface at a seam (role, not
  substance).
- **Leverage** — what callers get from depth (capability per unit of interface learned).
- **Locality** — what maintainers get from depth (change, bugs, and verification
  concentrate in one place).

### How the vocabulary maps onto Resonance

| Module-design term            | In Resonance                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------- |
| Module                        | a `@resonance/*` package (ADR-0003) — also any smaller unit inside it        |
| Interface / Seam              | the package's `src/index.ts` public entrypoint                               |
| Interface (error/invariant)   | Zod schemas validated at the boundary (conventions)                          |
| Interface at a seam           | a **port** — `MailPort`, `StoragePort` (ADR-0007), `PaymentsPort` (ADR-0006) |
| Two adapters → a real seam    | stub/fake + real client (`stubMail` + Resend; PGlite + Neon)                 |
| Deep module                   | `@resonance/db` — a few query helpers over Drizzle + pgvector + Neon/PGlite  |
| Accept deps, don't create     | `createDb`, `createAuth({db, mail})`, `Db`-as-first-arg                      |
| Interface is the test surface | the PGlite harness tests `@resonance/db` through its public interface        |

"Import only from the public entrypoint" (ADR-0003) restated in this vocabulary is
**"don't reach past the seam."** The operative checklist for _applying_ the tenet — the
three interface questions, the deletion test, the one/two-adapter rule, the testability
rules — lives once in [`docs/conventions.md`](../conventions.md) (the operational home,
per the one-fact-one-home rule, ADR-0016). This ADR holds the _decision and its why_;
conventions holds the _how_; the skill carries the teaching detail.

### Two tensions, resolved

**1. "boundary" vs "seam."** The skill says avoid "boundary" (overloaded by DDD's
bounded context); ADR-0003 is literally _package-boundaries-as-context-boundaries_. We
do **not** rename ADR-0003. Instead: **"boundary" keeps its ADR-0003 sense** — the
package / context / ownership unit — and **"seam" is the finer-grained location of an
interface.** A package boundary _is_ one kind of seam (the coarsest one); a port is a
finer seam inside or between packages. Both words are correct at their own scale.

**2. Model-ahead ports vs "two adapters = a real seam."** The principle says: one
adapter is a hypothetical seam, two make it real — don't introduce a seam unless
something varies across it. Yet Resonance deliberately models some seams before their
real adapter exists (`StoragePort` deferred behind a stub, ADR-0007; `PaymentsPort`
stubbed, ADR-0006). These are **not** violations: the **test fake is the second
adapter**, and the variance is **known and imminent** (Vercel Blob, Stripe Connect are
committed, just not wired). So the rule reads: **known future variance + a test fake
satisfies the two-adapter test.** The seam to avoid is the truly single-adapter one with
_no_ known variance — a seam invented for symmetry, exercised by nothing.

## Consequences

- **Design intent becomes reviewable and comparable.** "Is this module deep?" and "is
  this interface leaky?" are now askable in one shared language across packages, ports,
  query helpers, and component props. **Module depth** becomes an explicit review
  dimension (the shallow-module / leaky-interface / test-past-the-interface /
  deps-created-not-accepted / side-effects-not-results smells).
- **Planning designs for depth.** Decomposition names each step's interface/seam and
  sanity-checks depth (the deletion test) up front, rather than discovering shallowness
  in review.
- **No architecture change.** No package, port, or code is added or moved by this ADR;
  it is vocabulary + criterion. The architecture diagram (ADR-0015) is unaffected.
- **A curation cost.** The vocabulary must stay consistent across the skill, conventions,
  CLAUDE.md, the recipes, the planning prompts, and the review guidance — term drift
  re-creates exactly the ambiguity this ADR removes. One fact, one home; the others link
  (ADR-0016).
- **The skill's provisional note is retired** — its Resonance mapping now points at this
  ratified ADR instead of "to be ratified."

## Alternatives considered

- **Leave the tenet in the skill only, unratified.** The skill is loaded on demand, not
  always; without ratification the mapping stays "provisional," reviews have nothing to
  cite, and the two tensions above stay unresolved. Ratifying makes it the standard.
- **Rename ADR-0003's "boundary" to "seam" for one vocabulary.** Rejected: ADR-0003 is
  Accepted and its "boundary" is load-bearing (context/ownership). Scoping the two words
  to two scales costs nothing and keeps both ADRs true.
- **Drop the two-adapter rule so model-ahead ports comply trivially.** Rejected: the rule
  is the guard against seams-for-symmetry. Refining it ("known variance + a test fake
  counts") keeps the guard while blessing the deliberate model-ahead ports.
- **Put the operative checklist in this ADR.** Rejected by one-fact-one-home (ADR-0016):
  an ADR holds the decision and its rationale, not the operative rule. The checklist
  lives in conventions.md and links back here for the _why_.
