# The Resonance agentic workflow (end to end)

How work moves through this repo — from an idea to reviewed, gated, remembered code.
This operationalizes the agentic context model (ADR-0014) with a concrete tool stack
and a single loop (ADR-0016). **Read this before running a slice.** For session
hygiene within the loop, see [working-with-agents.md](working-with-agents.md); for the
_why_ behind the choices, see [ADR-0016](adr/0016-agentic-workflow-orchestration-and-knowledge-ownership.md).

## The loop, in one line

```
plan ──▶ prime ──▶ claim ──▶ isolate ──▶ build ──▶ gate ──▶ review ──▶ record ──▶ (unblocks next)
seeds     mulch     seeds    treehouse   skills   no-mistakes  lavish   mulch
```

A single thread — the **seed id** — runs the whole length and returns to mulch as an
evidence anchor. That thread is what keeps the tools coherent instead of being a pile
of disconnected CLIs.

## The tool stack

Layered on the **AXI** CLI-design substrate (token-efficient tools the kunchenguid
pieces all speak):

| Layer   | Tool             | Role                                                       | Status                       |
| ------- | ---------------- | ---------------------------------------------------------- | ---------------------------- |
| Plan    | **seeds** (`sd`) | Git-native issues + `sd plan` decomposition (the backlog)  | installed                    |
| Context | **mulch** (`ml`) | Cross-session expertise, primed each session; ADR index    | installed, 10 domains        |
| Isolate | **treehouse**    | Reusable git-worktree pool, one clean tree per agent       | installed (`treehouse.toml`) |
| Execute | **firstmate**    | One "first mate" dispatches parallel crewmates             | **not yet installed**        |
| Gate    | **no-mistakes**  | Push gate: review→test→lint→docs→PR→CI in its own worktree | installed (daemon running)   |
| Review  | **lavish**       | Annotate-and-send-feedback on rich HTML artifacts          | skill available; CLI TBD     |

`gnhf` (unattended single-objective grinds) is deliberately **parked** — firstmate is
the single orchestrator (ADR-0016).

## Two rhythms

Keep these separate — conflating them is what makes agent work feel chaotic:

- **Planning** — infrequent, human-led, judgment-heavy. Shape a slice, decompose it
  into seeds. A handful of times per slice, not per task.
- **Execution** — frequent, agent-driven, rule-governed. One seed → done, on repeat.

Planning fills the backlog; execution drains it.

## A unit of work, stage by stage

Following one seed from `ready` to `done`:

1. **Session start → warm (automatic).** `ml prime` + `sd prime` fire on the
   SessionStart hook. The agent lands with the mulch domain manifest, the seeds
   context, and always-loaded CLAUDE.md. No cold start.
2. **Claim (manual, governed).** `sd ready` → pick an unblocked seed →
   `sd update <id> --status in_progress`. The seed's package label is the routing
   signal — which package, which context, which mulch domain.
3. **Scope context — hot by default, cold on demand.** `ml prime <domain>` (or
   `--files <path>`) loads just that domain's records. Open the package `CLAUDE.md`.
   **Only if** a mulch `reference` record flags a ratified decision do you open the ADR
   — the cold path, paid for exactly when you're changing that decision.
4. **Isolate (treehouse).** At scale each seed claims a worktree from the pool
   (`treehouse get`; `post_create` runs `pnpm install`). `merge=union` on the mulch +
   seeds JSONL means parallel trees never collide.
5. **Build (agent + skill).** Invoke the matching recipe (`add-db-migration`, etc.) —
   each opens with a **Loop bracket** reminding you to prime and record. The on-save
   hook auto-formats/lints/typechecks every edit.
6. **Gate (you trigger → pipeline runs).** Push through no-mistakes. It runs
   review→test→lint→docs→PR→CI in its own worktree, auto-fixes mechanical findings, and
   escalates judgment calls. Because the on-save hook kept things clean, it rarely
   bounces on format/lint.
7. **Review, if visual (human-in-loop).** For a diagram, Figma component, or generated
   output — the agent emits HTML, you annotate in lavish, it iterates.
8. **Record + close (manual, governed).** `ml record <domain> --evidence-seeds <id>`
   for anything non-obvious; if it hardened into a permanent rule, promote it to
   CLAUDE.md/ADR and delete the mulch copy (one fact, one home). Then `sd close <id>` —
   which **auto-unblocks** downstream seeds. Loop back to `sd ready`.

## Automatic vs. governed vs. manual

| Behavior                     | How it's enforced                                                            |
| ---------------------------- | ---------------------------------------------------------------------------- |
| Prime context each session   | **Automatic** — `ml prime` + `sd prime` SessionStart hooks                   |
| Format/lint/typecheck        | **Automatic** — `post-edit.sh` PostToolUse hook, on every edit               |
| Gate pipeline once triggered | **Automatic** — no-mistakes daemon runs all steps + auto-fix + CI watch      |
| Parallel-write safety        | **Automatic** — `merge=union` on mulch + seeds JSONL                         |
| DAG unblocking               | **Automatic** — closing a seed frees its dependents in `sd ready`            |
| Claim seed / prime / record  | **Governed** — skill Loop brackets + package stanzas + `loop-guard.sh` nudge |
| Loop-bracket completeness    | **Governed** — `loop-guard.sh` Stop hook nudges (blocks crewmates)           |
| What to record / promote     | **Manual** — human/agent judgment (mulch is passive; nothing auto-captures)  |
| Gate approval escalations    | **Manual** — you answer no-mistakes' judgment-call gates                     |
| Visual review                | **Manual** — lavish annotate loop                                            |

## Knowledge lives in four stores, by temperature

One fact, one home — separated by _how hot_ it is (ADR-0016):

- **Hot — mulch** (`.mulch/`): primed every session, scoped, structured. Agent-discovered
  operational knowledge **and `reference` records that index the ADRs** by domain.
- **Warm — CLAUDE.md** (root + package): always loaded, curated operating rules + pointers.
- **Cold — ADRs** (`docs/adr/`): the ratified decision + _why_ + alternatives. Read rarely,
  on demand, when you're changing a decision. **Not a retrieval layer** — mulch's job is
  to make opening one rare.
- **seeds** (`.seeds/`): work, not knowledge. Links to the above.

The anti-pattern to police: the same operative rule restated in two hot stores or inside
an ADR. The ADR holds the _why_; the operational extract lives once in the hot/warm layer.

## From one agent to a fleet

**Today you are the first mate** — you walk the loop yourself, one seed at a time.
Everything above already works single-agent.

**At scale (once firstmate + `gh` land):** firstmate reads `sd ready`, spawns one
crewmate per package-labelled seed, each in a treehouse worktree, each auto-primed to
its domain, each shipping through the gate, each recording to its domain. You talk to
one liaison and supervise with `/afk`. The seed DAG makes this safe automatically — a
crewmate can't usefully start `ai` before `db`+`core` close, and package boundaries mean
crewmates never touch the same files.

## Running the whole thing: the `ship-slice` skill

For a full vertical slice, invoke **`/ship-slice`** (`.claude/skills/ship-slice/`). It
runs the loop with two human touchpoints:

1. **Rigorous plan (you're in the loop)** — it stress-tests the slice with you, then
   decomposes it into seeds via `sd plan`. You approve before execution.
2. **Autonomous execution** — it walks the DAG package by package, gating and recording,
   without stopping except on judgment-call escalations.
3. **Review handoff (you're back in the loop)** — it surfaces the finished slice via
   lavish for your review, applies feedback, then closes.

## Setup + current gaps

- **PATH:** `ml`/`sd`/`treehouse` live in `~/.bun/bin` and `~/.local/bin`. A crewmate's
  shell must have these on PATH or the prime hooks silently no-op.
- **`gh` CLI:** not installed — no-mistakes' push→PR→CI tail can't run without it (local
  review/test/lint steps work). Tracked as a seed.
- **firstmate:** not installed — the fan-out is manual until it is. Install is Phase 3.
- **lavish:** available as a skill; install the CLI when you want the annotate loop.

## Keep the framework true

The loop only stays valuable if maintained (extends [working-with-agents.md](working-with-agents.md)):

- New ratified decision → **ADR**, and index it with a mulch `reference` record.
- Discovered tactical learning → **mulch** (`ml record`), anchored to its domain + seed.
- A learning that hardens into a permanent rule → promote to **CLAUDE.md/ADR**, delete
  the mulch copy.
- New package → `ml add <name>` + the _Working here_ stanza in its CLAUDE.md.
- System-shape change → update the architecture diagram in the same change (ADR-0015).
