---
name: ship-slice
description: Use to take a vertical slice or multi-package feature from idea to reviewed, gated delivery through the Resonance agentic loop (ADR-0016) — rigorous interactive planning up front, autonomous package-by-package execution through the no-mistakes gate, then a human review checkpoint before close. Invoke when the user wants to build or ship a whole slice/feature spanning packages (e.g. "ship the discovery-search slice", "run the ProfileGen slice end to end", "build out the messaging feature").
---

# Skill: ship a vertical slice (end-to-end workflow)

Runs the full agentic loop for one slice with **exactly two human touchpoints** — the
user plans with you, steps away while you execute, and returns to review. Everything in
between is autonomous. The reference for the whole model is
[docs/agentic-workflow.md](../../../docs/agentic-workflow.md); the _why_ is ADR-0016.

**The contract:** the user is in the loop for Phase 1 (plan) and Phase 3 (review), and
**out** of it for Phase 2 (execution) except for genuine judgment-call escalations. Do
not check in mid-execution for reassurance.

## Preflight

- **Branch.** Work on a feature branch (`feat/<slice>`); never on `main`/default. Create
  one if needed.
- **Primes.** `ml prime` + `sd prime` run at session start; if this is mid-session, run
  them now.
- **MCP/tools.** If the slice has UI, confirm the **Figma MCP** is authorized (`/mcp`).
  If it will open PRs, confirm `gh` is installed (else no-mistakes' PR/CI steps are
  skipped — tell the user).

## Phase 1 — Rigorous plan · HUMAN GATE

Do not shortcut this; "rigorous" is the point.

1. **Stress-test the idea with the user.** Use the `grillme` skill (or
   `brainstorm-and-plan`) to resolve scope, edge cases, and each decision branch until
   you share understanding. Pull cold context only as needed: `ml prime <domain>`, the
   package `CLAUDE.md`, and any ADR a mulch `reference` record flags.
2. **Avoid duplication.** `sd search <topic>` / `sd ready` — reuse an existing parent
   seed/plan if one exists instead of creating a second.
3. **Create the parent seed.** `sd create --title "<slice>" --type feature --priority <n>`.
4. **Decompose along package boundaries.** `sd plan prompt <id>` → author the plan
   (context / approach / steps / risks / acceptance). **One step per package touched**,
   with a dependency DAG: foundations first (`core`, `db`), then `ai` + `ui` in
   parallel, then `web` wiring, then `e2e`. Label each step with its package. Submit:
   `sd plan submit <id> --plan <file>`.
5. **Present for approval.** Show the plan (render via **lavish** if it benefits from
   annotation). **Wait for the user's explicit go-ahead before Phase 2.**

## Phase 2 — Autonomous execution · NO human intervention

Loop until every child seed is closed. Per the DAG, take unblocked seeds from `sd ready`:

For each seed:

1. **Claim + scope.** `sd update <id> --status in_progress`; `ml prime <domain>` (or
   `--files <path>`); open the package `CLAUDE.md`.
2. **Build.** Invoke the matching recipe — `add-db-migration`, `add-ai-agent`,
   `add-ui-component-from-figma`, `scaffold-domain-package`, `update-architecture-diagram`
   — or implement directly following `docs/conventions.md`. Write tests (ADR-0011; TDD
   for features/bugfixes).
3. **Verify locally.** `pnpm --filter <pkg> typecheck lint test` (Turbo-affected).
4. **Gate.** Push through **no-mistakes** (`git push no-mistakes` or the `/no-mistakes`
   skill). Resolve mechanical findings automatically. **Escalate only genuine
   judgment-call gates to the user** — this is the sole allowed interruption.
5. **Record + close.** `ml record <domain> --type <...> --evidence-seeds <id>` for
   anything non-obvious; if it hardened into a permanent rule, promote it to CLAUDE.md/ADR
   and delete the mulch copy. Then `sd close <id>` → unblocks dependents.

**Parallelism:** when independent seeds are ready, dispatch one **subagent per package**
(they touch disjoint files, so they don't collide) rather than doing them in series.
_At scale this phase is `firstmate` fanning out crewmates; the human gates are unchanged._

## Phase 3 — Review handoff · HUMAN GATE

When all children are closed and the parent seed is unblocked:

1. **Assemble the result** — per-package summary, PRs/diffs, test + gate results,
   acceptance-criteria check against the plan.
2. **Surface for review via lavish** — plan-vs-result and any visual output (generated
   UI, diagram changes). Poll for the user's annotations/feedback.
3. **Apply feedback** using Phase 2 mechanics (claim → fix → gate → record).
4. **On approval:** close the parent seed, record slice-level learnings, confirm the
   architecture diagram + docs are in sync (ADR-0015), and hand back a final summary.

## Guardrails

- **Stay in the loop.** Every seed is claimed before work and closed after; every
  non-obvious learning is recorded; one fact, one home (ADR-0016).
- **Never skip the gate** and never push straight to `origin`.
- **Respect the DAG** — don't start a blocked seed.
- **Package boundaries** — one agent per package; import only from public entrypoints
  (ADR-0003); no domain logic in `apps/web` (ADR-0002).
- **Keep the framework true** — ADRs, the diagram, and CLAUDE.md files stay in sync as
  work lands.
