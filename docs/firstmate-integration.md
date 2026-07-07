# Firstmate integration runbook

How to put the resonance agentic loop under **firstmate** orchestration: one "first
mate" dispatches parallel crewmates, each of which runs _our_ loop (prime → claim →
recipe → gate → record → close) inside an isolated treehouse worktree.

Read [agentic-workflow.md](agentic-workflow.md) for the loop and
[ADR-0016](adr/0016-agentic-workflow-orchestration-and-knowledge-ownership.md) for the
why. **This doc is the step-by-step.**

## The model (why almost nothing needs reconfiguring)

```
ORCHESTRATION  the first mate      firstmate AGENTS.md + project mode
  │  dispatches, isolates, supervises (/afk), sources tasks from `sd ready`
  ▼
EXECUTION      each crewmate       the resonance repo — ALREADY BUILT
     a Claude session in a treehouse worktree of resonance, so it inherits
     our .claude hooks, CLAUDE.md, skills, mulch domains, and seeds backlog
     and self-governs: prime → claim → recipe → no-mistakes gate → ml record → close
```

You don't teach firstmate our loop. You point its three coordination surfaces —
worktrees, backlog, knowledge — at our single sources, and let the repo govern each
crewmate.

## ⚠️ The one gotcha: firstmate clones from your git remote

firstmate clones your project under its `projects/` **from the git remote**. So a
crewmate only inherits our loop if the tooling (`.claude/`, `.mulch/`, `.seeds/`,
`CLAUDE.md`, `treehouse.toml`, `docs/`) is **committed _and_ pushed _and_ on the branch
firstmate clones**. If you point firstmate at a branch that lacks `.mulch/`/`.seeds/`,
crewmates start blind. Step 1 handles this.

## Prerequisites — state as of 2026-07-07

- [x] `gh` installed + authenticated (jwhector) — the gate can open PRs
- [x] `tmux` (session manager) and the `lavish-axi` CLI installed
- [x] `~/.bun/bin` on PATH via `~/.zshenv` — crewmates can run `ml`/`sd`
- [x] `treehouse.toml`, the `no-mistakes` gate, 10 mulch domains, and plan `pl-97aa`
      (ProfileGen) with `db`/`core` ready
- [ ] **workflow tooling merged onto the branch firstmate will clone, and pushed**
- [ ] firstmate installed, launched, and configured (this runbook)

---

## Step 1 — Get the tooling onto the remote branch firstmate will use

From `~/Documents/Projects/resonance`, land the workflow tooling on the branch crewmates
will build from (here: the feature line — use `main` instead if that's what firstmate
clones), then push:

```bash
# commit anything still pending (e.g. the PATH-hardened settings.json)
git add -A && git commit -m "chore(workflow): phase-3 tooling (hooks, gh, seeds)" \
  -m "Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"

# merge the workflow tooling into the base branch firstmate will clone
git checkout feat/creator-interview-profilegen
git merge chore/agentic-workflow

# push over HTTPS (keychain) — firstmate clones this
git push origin feat/creator-interview-profilegen
```

Confirm `.mulch/expertise/*.jsonl`, `.seeds/*.jsonl`, `.claude/`, and `treehouse.toml`
are present on the pushed branch — that's what makes crewmates inherit the loop.

## Step 2 — Install and launch firstmate

firstmate is not a daemon; it's a Claude project you _operate_:

```bash
git clone https://github.com/kunchenguid/firstmate ~/firstmate
cd ~/firstmate && claude
```

You're now talking to **the first mate**.

## Step 3 — Add the resonance project

In the first-mate session, reference the repo conversationally so firstmate clones it
under `projects/`:

> "Add my project github.com/jwhector/resonance on branch
> feat/creator-interview-profilegen."

Verify the clone has `.mulch/`, `.seeds/`, and `.claude/` (Step 1).

## Step 4 — Configure the resonance project's operating manual

Put the **operating block** (below) into firstmate's `AGENTS.md` for the resonance
project, and set the project mode to `no-mistakes`. The exact file path / command lives
in firstmate's own manual (`AGENTS.md` / `docs/configuration.md`) — confirm it there; the
_content_ is what matters:

### Operating block — paste into firstmate's AGENTS.md (resonance project)

```markdown
## Resonance — do not re-implement its loop

Resonance runs its own agentic loop (ADR-0016; docs/agentic-workflow.md). Dispatch
crewmates and let the repo govern them.

- Project mode: no-mistakes. Every ship crewmate ships through the repo's no-mistakes
  gate. Add +yolo only for fully unattended runs.
- Worktrees: treehouse (default). The repo's treehouse.toml warms them (pnpm install).
- Backlog = seeds, NOT a firstmate task list. Source work from `sd ready` in the
  project; dispatch one ship crewmate per UNBLOCKED seed. Respect the dependency DAG —
  re-check `sd ready` after each PR merges before dispatching the next wave. Never
  invent a parallel task list.
- Knowledge = mulch + seeds. Route /stow explicitly:
  - durable learnings -> ml record <domain> --evidence-seeds <seed-id>
  - undone next-steps -> sd create --title "..."
    Do NOT create .stow-notes.md — mulch and seeds are the only stores.
- Launch each crewmate with LOOP_GUARD_BLOCK=1 in its environment, so the repo's
  Stop hook blocks a crewmate that finishes without recording / claiming its seed.
- Keep each crewmate's task prompt minimal and defer to the repo (template below).
- Ship crewmates open PRs via the gate; the human does the final slice review in a
  resonance session (`/feature` Phase 3, lavish). Do not auto-merge the parent slice.
```

### Crewmate task prompt — the template the first mate hands each crewmate

```markdown
You are a crewmate working seed <SEED_ID> in the resonance repo (your own treehouse
worktree). The repo governs how you work — follow its loop (CLAUDE.md → "Agentic
workflow", ADR-0016):

1. Claim: `sd update <SEED_ID> --status in_progress`.
2. Prime: `ml prime <domain>` (the seed's package label) + read that package's CLAUDE.md.
3. Build using the matching recipe skill; write tests (ADR-0011).
4. Gate: `git push no-mistakes`. Fix mechanical findings. If a real judgment call
   blocks you, record a scout note and stop rather than guess.
5. Record: `ml record <domain> --type <...> --evidence-seeds <SEED_ID>` for anything
   non-obvious (pass --files explicitly).
6. Close: `sd close <SEED_ID>`.

Stay strictly inside your package's boundary; do not touch other packages.
```

## Step 5 — Dispatch the first wave

> "Dispatch ship crewmates for the ready seeds in resonance — `sd ready` shows
> resonance-720e (db) and resonance-25b1 (core). One crewmate each, no-mistakes mode."

They run in parallel (disjoint packages → no collisions).

## Step 6 — Supervise and drain the DAG

- `/afk` for away-mode supervision.
- As each crewmate's PR **merges**, its seed closes on the base branch and the DAG
  advances: `ai` + `ui` unblock, then `web`, then `e2e`. Dispatch each wave as
  `sd ready` reports it. (Dependents unblock on _merge_, which is the correct
  semantics — don't start `ai` until `db` is actually merged.)
- `/stow` between waves sweeps loose knowledge into mulch/seeds per the operating block.

## Step 7 — Review and close the slice

Back in a **resonance session** (not firstmate): run `/feature` Phase 3 — assemble the
result, review via lavish, apply feedback, then `sd close resonance-6f38` (the parent).

---

## Verify a crewmate actually inherited the loop

Run inside one of firstmate's treehouse worktrees:

```bash
ml prime db >/dev/null 2>&1 && echo "mulch OK"    || echo "BROKEN: ml not on PATH / no .mulch"
sd ready   >/dev/null 2>&1 && echo "seeds OK"     || echo "BROKEN: sd not on PATH / no .seeds"
grep -q loop-guard .claude/settings.json          && echo "hooks present"
```

## Troubleshooting

- **Crewmate primes are empty / `ml: command not found`** → `~/.bun/bin` isn't on the
  crewmate shell's PATH. The `~/.zshenv` fix covers login/interactive shells; make sure
  firstmate's crewmate shell sources it.
- **Hooks don't run (no auto-format, no prime, no loop-guard)** → Claude Code gates hook
  execution for safety. Autonomous crewmates need our hooks pre-approved — via
  firstmate's autonomy path (`+yolo`) or a trusted user-settings entry — or they run
  ungoverned.
- **Your working dir doesn't show the crewmates' mulch records / closed seeds** → they
  live in firstmate's _clone_ (`~/firstmate/projects/resonance`). They reach your working
  dir when their branches merge and you `git pull`. Two checkouts, synced via the remote.
- **`sd ready` shows a seed that's actually blocked** → the base branch is stale; the
  dep's close hasn't merged yet. Wait for the merge, then re-check.

## New-session kickoff prompt

Paste this to spin up a fresh Claude session with full context of this integration:

```text
Read CLAUDE.md, docs/agentic-workflow.md, docs/firstmate-integration.md, and HANDOFF.md.

State of the world: the resonance agentic workflow (seeds + mulch + treehouse +
no-mistakes + lavish, ADR-0016) is built and committed on branch chore/agentic-workflow.
Prereqs are done: gh authed, tmux + lavish CLI installed, ~/.bun/bin on PATH. The
ProfileGen slice is planned as seeds plan pl-97aa with resonance-720e (db) and
resonance-25b1 (core) ready.

Task: walk me through the firstmate integration in docs/firstmate-integration.md, step
by step, starting at Step 1 (get the tooling merged onto the base branch and pushed so
firstmate's clone inherits the loop). Do the repo-side steps you can; hand me the exact
commands for the interactive firstmate ones.
```
