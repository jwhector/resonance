# The Resonance development workflow

This is the operational source for all harnesses: Claude Code, Codex, and other
agents or humans. ADR-0021 supersedes ADR-0016's orchestration and gate layering;
knowledge ownership remains unchanged. Tool availability is checked locally.

## One feature, one delivery owner

Plan → build (helpers when useful) → integrate → gate → human review → record.

Default to one integrated branch and PR for a coherent feature. Separate PRs are
appropriate for a part that something else needs merged first, not merely because it
is independently shippable or because two packages were touched. A plan's child steps
are work units, not PR units: siblings that only share a contract already on `main`
(for example the `db`, `ai` and `ui` steps of one feature) build on one integration
branch and pass one gate together. A small fix can run inline without a feature plan
or subagents.
Read-only questions do not require a seed, code gate, commit, or push.

1. **Orient.** Read root/package context as needed. Run `ml prime` and `sd prime`
   once if available and not already injected. Load only relevant Mulch domains.
   Generic tool-generated Bun/check/push instructions do not override this repo's
   pnpm commands, delivery ownership, or the user's scope. If tools are missing,
   retain the task and findings in the handoff rather than claiming they were recorded.
2. **Plan.** Reuse or claim a Seeds task for implementation. For substantial work,
   settle scope, acceptance criteria, package interfaces, dependencies, and early
   exits with the user. Ask about consequential ambiguity. Record S/M/L size and
   risk before building using [workflow-metrics.md](workflow-metrics.md).
   Existing explicit approval counts; do not ask for the same approval twice.
3. **Build.** Use the matching recipe. Delegate only bounded independent work when
   the harness permits it and saved time justifies startup/context cost. A single
   task runs inline. Multiple ready tasks are an opportunity, not a mandatory fan-out.
   Start with at most two builders; increase only for independently useful work and
   within the harness's actual limit. Treehouse's pool size is not an agent limit.
4. **Isolate and integrate.** Prefer a warm Treehouse lease when available; otherwise
   use the harness's worktree support or a Git worktree. Start from the integration
   branch's current commit explicitly: built-in worktrees may default to main.
   Give each writer an explicit file scope, base commit, acceptance criteria, and
   instructions to return changes/tests/metrics without pushing or starting a gate.
   Shared lockfiles, trackers, root config, and cross-package interfaces belong to
   the integration owner. Read-only helpers can share a checkout.
   Integrate completed changes and test their interfaces before dependent tasks
   start. Local integration unblocks dependencies within this feature; dependencies
   delivered by separate PRs require merge. Close a child only after its changes
   are integrated and accepted. Keep the parent open until delivery is complete.
5. **Validate once through the owner.** Run focused tests while building. Exercise
   changed behavior with /verify; reuse valid evidence for the same commit rather
   than running a second full suite as a ritual. Record learnings and measurements
   **before** submitting, so `.mulch/`, `.seeds/` and `workflow/metrics/` ride the same
   candidate the gate reviews and a learning never costs a second run. Commit coherent
   changes, then the owner drives
   `no-mistakes axi run --intent "<goal, constraints, accepted decisions, standing consents>"`
   when shipping is authorized. Follow the installed skill for active-run custody and
   [review policy](workflow-review.md) for which gate questions to decide yourself.
   The gate owns formal code review, test, document/lint, push, PR, and CI. Do not
   prepend a standalone /code-review or ask every builder to run a gate.
   [Review policy](workflow-review.md) specifies models and justified extra passes.
6. **Handoff.** Report acceptance evidence, outstanding risks, PR state, review
   passes and reasons, and measurement completeness. Plan approval and final review
   are the usual human touchpoints; unresolved decisions and separate-PR merge
   dependencies can need additional input. Visual review uses Lavish when available;
   screenshots, diagrams, and written feedback are a portable fallback.
7. **Close.** Close completed Seeds tasks and record the feature outcome. Learnings
   that surface during the gate itself go on top of the same branch: a diff confined to
   `.mulch/`, `.seeds/` or `workflow/metrics/` is published with the PR without another
   product review cycle, and if the gate ends without publishing it, wait for a terminal
   outcome, follow the reported branch_sync next action to recover custody, then push
   it directly and say so in the handoff. Never push while a run is active: the gate
   may hold unpushed fix commits. Validate the measurement schema before committing it.
   Do not invent notes merely to satisfy a hook.

## Checks have different jobs

| Layer         | Job                                                      | Trigger                                                                               |
| ------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Edit feedback | Prettier and workspace ESLint, best effort; no typecheck | Claude edit hook, or explicit `pnpm workflow:post-edit` with tool-event JSON on stdin |
| Pre-commit    | Formatting and lint for staged paths                     | Opt-in `git config core.hooksPath .githooks` per clone                                |
| Development   | Focused behavior tests and affected-flow verification    | Relevant changes                                                                      |
| Shipping gate | One owned formal review and validation pipeline          | Owner submits committed feature                                                       |
| CI            | Independent checks of the published commit               | PR updates and pushes to main                                                         |
| Live smoke    | Credential-gated external-service checks                 | Nightly or manual workflow                                                            |

CI is intentionally independent of local evidence. The current `pnpm typecheck`,
`lint`, `test`, and `build` scripts select the workspace through Turbo; they are
not automatically restricted to Git-affected packages. Caching can avoid repeated
execution. Do not claim affected-only checks without explicit filtering and a
reliable base commit. Keep full CI while measuring opportunities to narrow it.

## Harness adapters and optional tools

- **Codex / AGENTS.md readers:** root AGENTS.md links shared context. The repo's
  `.codex/agents/reviewer.toml` selects the formal review model when that role is used.
- **Claude Code:** CLAUDE.md links this workflow; `.claude/settings.json` supplies
  session/edit/stop hooks. `.claude/agents/reviewer.md` defines its review role.
- **Other harnesses:** read AGENTS.md and recipes directly; use equivalent tools,
  explicit file scopes, and the same measurement format. Follow the reviewer
  availability policy before substituting a model.
- **Firstmate:** optional for overnight or multi-session supervision. Its workers
  follow the same builder contract; it does not change who owns delivery.
- **No-mistakes:** external shipping executor. Its harness/model selection is
  separate from the calling agent and repo subagent definitions. See setup guidance
  in workflow-review.md. Missing configuration is reported, not silently treated
  as a qualifying review.

## Knowledge and maintenance

Mulch owns tactical discoveries and ADR references; CLAUDE.md owns durable product
rules; ADRs own ratified decisions and rationale; Seeds owns work. Link rather
than duplicate. Keep package context and the architecture diagram current when
product shape changes. Dev-workflow changes alone do not alter the runtime diagram.
Use audit-workflow to review measured friction and choose a small evidence-backed
improvement; do not load all logs or launch audits on every edit.
