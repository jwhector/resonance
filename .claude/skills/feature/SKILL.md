---
name: feature
description: The single entry point for building a feature or vertical slice end to end. Runs a rigorous interactive planning stage codified as a structured seeds plan you approve, then executes it with conditional parallel orchestration — worktree-isolated subagents when the plan parallelizes, inline when it doesn't — each agent shipping through the no-mistakes gate and recording findings to mulch, then hands back to you for final review. Invoke at the start of any new feature, vertical slice, or multi-package change (e.g. "build the discovery-search feature", "/feature messaging", "run the ProfileGen slice").
---

# /feature — the end-to-end feature workflow

The one command to build a feature. **Two human touchpoints** — you _plan_ with it and
you _review_ at the end. Everything between is autonomous, and orchestration happens
**inside this skill, only when the plan is parallelizable**.

Each unit of work runs the repo's standard loop (CLAUDE.md → _Agentic workflow_,
ADR-0016): prime → claim → recipe → no-mistakes gate → `ml record` → close. This skill
wraps that with planning up front, conditional parallel fan-out in the middle, and your
review at the end. For heavier-than-one-session runs, it escalates to firstmate
(see [docs/firstmate-integration.md](../../../docs/firstmate-integration.md)).

## Preflight

- Work on a feature branch (`feat/<slug>`), never `main`.
- Primes ran at session start; if mid-session, run `ml prime` + `sd prime`.
- If the feature has UI, confirm the Figma MCP is authorized (`/mcp`).

## Phase 1 — Rigorous plan · HUMAN GATE

Don't shortcut this; "rigorous" is the point.

1. **Stress-test the idea with the user.** Use `grillme` (or `brainstorm-and-plan`) to
   resolve scope, edge cases, and each decision branch until you share understanding.
   Pull cold context only as needed: `ml prime <domain>`, the package `CLAUDE.md`, and
   any ADR a mulch `reference` record flags.
2. **Avoid duplication.** `sd search <topic>` / `sd ready` — reuse an existing parent
   seed/plan instead of creating a second.
3. **Create the parent seed:** `sd create --title "<feature>" --type feature --priority <n>`.
4. **Decompose along package boundaries.** `sd plan prompt <id>` → author the plan
   (context / approach / steps / risks / acceptance). **One step per package touched**,
   with an explicit dependency DAG: foundations first (`core`, `db`), then `ai` + `ui`
   in parallel, then `web`, then `e2e`. Label each step with its package. **Design for
   depth (ADR-0017):** name each step's **interface/seam** and sanity-check its **depth**
   with the deletion test; the plan's `approach` should identify the **seams** the slice
   adds. Submit: `sd plan submit <id> --plan <file>`. **The DAG is what makes Phase 2
   parallelizable — design it so independent steps are genuinely independent.**
5. **Present for approval.** Show the plan (render via **lavish** for annotation).
   **Wait for the user's explicit go-ahead before Phase 2.**

## Phase 2 — Autonomous execution · orchestrate only if necessary

Drain the plan's DAG in **waves**. Per wave:

1. `sd ready` → the seeds unblocked right now.
2. **Pick the lightest orchestration that fits** (this is the "only if necessary"):
   - **1 ready seed** → do it **inline** in this session. Fan-out overhead isn't worth it.
   - **≥2 ready seeds** → **fan out one subagent per seed, in parallel** (Agent tool,
     `general-purpose`), each in its own worktree. They touch disjoint packages, so they
     don't collide.
3. **Each parallel subagent** runs the standard loop inside a **treehouse-leased worktree**:
   ```bash
   WT=$(treehouse get --lease --lease-holder "<seed-id>")   # warm: deps + Turbo cache hot
   cd "$WT"
   git checkout -b "feat/<seed-slug>"                        # own branch → own PR
   sd update "<seed-id>" --status in_progress
   ml prime "<domain>"                                       # + read that package's CLAUDE.md
   # design deep modules (ADR-0017): a small interface at a clean seam, testable through it
   # ...build via the matching recipe (add-db-migration, add-ai-agent, ...); write tests...
   git push no-mistakes                                      # its OWN gate + PR ("its own review")
   ml record "<domain>" --type <...> --evidence-seeds "<seed-id>" --files <touched>
   sd close "<seed-id>"
   treehouse return "$WT"
   ```
   The subagent returns a **structured result**: seed id, PR link, gate outcome
   (pass / findings), what it recorded, and any escalation.
4. **Barrier** — wait for the wave; collect results + findings.
5. **Escalations surface immediately.** If a subagent's gate raised a _judgment call_
   (not a mechanical fix), stop and bring it to the user — don't guess.
6. **The DAG advances on merge.** A dependent seed needs its dependency's _code_, not
   just a closed seed — so a green PR must **merge** before its dependents' wave starts.
   Enable auto-merge-on-green for hands-off progression; otherwise each wave boundary is
   a merge checkpoint. Then re-run `sd ready` → next wave. Repeat until the DAG is drained.

**Why treehouse and not the Agent tool's built-in `isolation: "worktree"`:** the built-in
spins a _cold_ worktree each time (fresh `pnpm install`, cold Turbo cache); treehouse's
pool keeps each worktree dependency- and build-cache-**warm** (our `treehouse.toml` runs
`pnpm install` on create). In this monorepo that saves a cold install + cold rebuild on
every subagent, every wave. `max_trees` (16) caps concurrent leases. Fall back to
`isolation: "worktree"` only if treehouse is unavailable.

### When to escalate to firstmate

This skill's native fan-out covers most features. Reach for **firstmate**
([docs/firstmate-integration.md](../../../docs/firstmate-integration.md)) only when you
outgrow a single session — Phase 1 and Phase 3 stay identical; only the Phase-2 executor changes:

| Native subagents (this skill)        | firstmate                                   |
| ------------------------------------ | ------------------------------------------- |
| runs within a session; you're around | **unattended / overnight** runs             |
| moderate wave sizes                  | scale beyond one session's context          |
| all-Claude                           | cross-harness (Codex…), `/afk`, persistence |

## Phase 3 — Review handoff · HUMAN GATE

When the DAG is drained (all children closed, parent unblocked):

1. **Assemble the result** — per-package summary, PRs/diffs, gate + test outcomes, and
   an acceptance-criteria check against the plan.
2. **Surface for review via lavish** — plan-vs-result and any visual output (generated
   UI, diagram changes). Poll for the user's annotations.
3. **Apply feedback** using Phase 2 mechanics (a fix is just another small seed).
4. **On approval:** close the parent seed, record slice-level learnings, confirm the
   architecture diagram + docs are in sync (ADR-0015), and hand back a final summary.

## Guardrails

- **Stay in the loop.** Every seed is claimed before work and closed after; every
  non-obvious learning recorded (`--files` explicit); one fact, one home (ADR-0016).
- **Never skip the gate** and never push straight to `origin`.
- **Respect the DAG** — never dispatch a blocked seed; advance on merge.
- **Package boundaries** — one subagent per package; import only from public entrypoints
  (ADR-0003); no domain logic in `apps/web` (ADR-0002).
- **Keep the framework true** — ADRs, the diagram, and CLAUDE.md files stay in sync;
  `pnpm check:workspace` must pass.
