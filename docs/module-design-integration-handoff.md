# Handoff — integrate the deep-module design tenet across the workflow

> **For a fresh session.** The authoring session's context grew too large to do the
> wiring safely. This is the brief. Entry-point seed: **`resonance-d279`**. The tenet
> itself lives in [`.claude/skills/module-design/SKILL.md`](../.claude/skills/module-design/SKILL.md).

## The tenet, in one line

Design **deep modules**: a lot of behaviour behind a small **interface**, placed at a
clean **seam**, testable through that interface. Use the exact vocabulary — module,
interface, implementation, depth, seam, adapter, leverage, locality.

## How it relates to what already exists (the important framing)

**This is not a pivot. It's the vocabulary and the explicit criterion for what Resonance
already does implicitly.** The alignment is strong:

| Module-design term                       | Already in Resonance as                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| Module                                   | a `@resonance/*` package (ADR-0003)                                                    |
| Interface / Seam                         | the package's `src/index.ts` public entrypoint ("import only from public entrypoints") |
| Interface (incl. error modes/invariants) | Zod schemas at the boundary (conventions)                                              |
| Interface at a seam                      | a **port** (`MailPort`, `StoragePort`, `PaymentsPort`)                                 |
| Adapter (×2 → real seam)                 | stub/fake + real client (`stubMail` + Resend; PGlite + Neon)                           |
| Deep module                              | `@resonance/db` — few query helpers over Drizzle + pgvector + Neon/PGlite              |
| Accept deps, don't create                | `createDb`, `createAuth({db, mail})`, `Db`-as-first-arg                                |
| Interface is the test surface            | PGlite harness tests `@resonance/db` through its interface                             |

So the work is **formalization + vocabulary unification + making _depth_ an explicit
design and review criterion** — not new architecture.

### Two tensions to resolve (don't skip these)

1. **"boundary" vocabulary clash.** The skill says avoid "boundary"; Resonance's ADR-0003
   is literally "package-boundaries-as-context-boundaries." **Resolution:** keep
   "boundary" for the package/context/ownership sense (ADR-0003) and introduce "seam" for
   the finer-grained location of an interface. A package boundary _is_ one kind of seam.
   Do **not** rename ADR-0003; add the mapping in the new ADR.
2. **Model-ahead ports vs "two adapters = real seam."** Resonance deliberately models some
   seams before their real adapter exists (`StoragePort` deferred, `PaymentsPort` stubbed).
   **Resolution:** these are justified because the test fake is the _second_ adapter and
   the variance is known/imminent. Note in the ADR that "known future variance + a test
   fake" satisfies the two-adapter rule; a truly single-adapter, no-known-variance seam is
   the one to avoid.

## The junctures — where the tenet must be woven in

Weave it at every point where design happens or design quality is enforced:

| Juncture                                      | Change                                                                                                                                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ratify**                                    | New **ADR-0017: "Design deep modules"** — the vocabulary, principles, the two resolutions above. Add its row to `docs/adr/README.md`.                                                                                                       |
| **Index (self-heal)**                         | `ml record architecture --type reference ... --files docs/adr/0017-*.md` (per the ADR-README rule) so priming surfaces it.                                                                                                                  |
| **Conventions**                               | Add a **"Module design"** section to `docs/conventions.md`: the glossary, the three interface questions, the deletion test, interface-as-test-surface, one/two-adapter rule, and the three testability rules. This is the operational home. |
| **Root CLAUDE.md**                            | One warm-layer line under the golden rules: "Design deep modules — small interface, lots hidden; the package entrypoint is the seam (ADR-0017, conventions.md)."                                                                            |
| **Recipe: scaffold-domain-package**           | Frame the package as a deep module; add "design the smallest `src/index.ts` interface that delivers the behaviour; apply the deletion test" using the vocabulary.                                                                           |
| **Recipe: add-ai-agent**                      | Note the registry runner is the deep module (small interface = "define an agent"); keep each agent's interface small.                                                                                                                       |
| **Recipe: add-db-migration**                  | Query helpers are seams; keep their interface small + deep; `Db`-as-first-arg is the DI seam.                                                                                                                                               |
| **Recipe: add-ui-component-from-figma**       | Props **are** the interface — small prop surface, accessible behaviour hidden behind it.                                                                                                                                                    |
| **(Optional) new recipe**                     | `design-a-seam` / `add-a-port` — when to introduce a seam (two-adapter rule) and where to place it. Or fold into conventions.                                                                                                               |
| **Planning (`/feature` Phase 1 + `sd plan`)** | Add to the planning prompts: "decompose into deep modules; for each step, name its interface/seam and sanity-check depth (deletion test)." The plan's `approach` should identify seams.                                                     |
| **Review (no-mistakes + `/code-review`)**     | Add **module depth** as a review dimension: flag shallow modules (interface ≈ implementation), leaky interfaces (callers reach past the seam), test-past-the-interface shapes, deps created-not-accepted, side-effects-not-results.         |
| **Agent prompts**                             | Add "design deep modules (ADR-0017)" to the `/feature` subagent + firstmate crewmate prompt templates so every building agent applies it.                                                                                                   |
| **mulch usage**                               | Record design learnings using the vocabulary ("shallow module", "leaky seam") so they're consistent + searchable.                                                                                                                           |

## Suggested order (each is a seed under `resonance-d279`)

1. **ADR-0017** (source of truth) → README row → mulch reference record. _Do this first;_
   everything else links to it.
2. **conventions.md** "Module design" section (the operational rules).
3. **Root CLAUDE.md** pointer line.
4. **The four recipes** (scaffold, ai, db, ui) — one-paragraph reframing each.
5. **Planning + prompts** (`/feature` Phase 1, subagent/crewmate templates).
6. **Review dimension** (no-mistakes review guidance / a checklist).
7. Verify: `pnpm check:workspace` still passes; the new ADR is indexed; a spot-check that
   `ml prime <domain>` surfaces the tenet where an agent would design.

Note the ADR-0016 numbering history: an "ADR-0016" was once penciled for the
`RESONANCE_FAKES` fakes-seam but never written (0016 became the agentic-workflow ADR;
module-design took 0017). The testing-seam decision is **now written as ADR-0018**, which
reverses the runtime-fakes approach: live-by-default code, fakes injected in tests, and a
live-smoke gate.
