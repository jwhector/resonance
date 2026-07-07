# Working with Agents in This Repo

Resonance is built with **AI-first agentic engineering** (ADR-0014): the repo is
organized so an AI agent — or a human — can pick up work with minimal context loss and
produce uniform, reviewable results. This guide is how to run a productive agent
session against that framework. It's general; the current next-step lives in
[`HANDOFF.md`](../HANDOFF.md).

> **The end-to-end workflow** — planning, execution, gating, and memory via seeds +
> mulch + treehouse + no-mistakes — is defined in
> [agentic-workflow.md](agentic-workflow.md) (ADR-0016). This guide covers session
> hygiene _within_ that loop. Where the two differ (e.g. plans now live in **seeds**,
> not `docs/plans/`), the workflow doc wins.

## TL;DR — your first move in a new session

**Don't re-explain the project. Point the agent at the docs and name the task.** The
repo bootstraps the agent itself. A good opening message:

> Read `CLAUDE.md`, `HANDOFF.md`, and the `docs/adr/` index (read in full any ADR
> relevant to the task). Then: **\<the task\>**. Before non-trivial code, write a short
> plan and let me review it. Use the project recipe skills and follow
> `docs/conventions.md`. Use the Context7 MCP for current library APIs and the Figma
> MCP for UI. Work on a feature branch and keep the architecture diagram in sync.

That one message activates the whole framework: context, recipes, conventions, tools,
guardrails.

## What the agent reads to orient itself

| Source                | What it provides                              | When the agent loads it           |
| --------------------- | --------------------------------------------- | --------------------------------- |
| Root `CLAUDE.md`      | Project overview + golden rules               | Automatically (always in context) |
| Package `CLAUDE.md`   | That package's rules, what's real vs. stubbed | When working in that package      |
| `docs/adr/`           | The _why_ behind every architectural choice   | Before changing architecture      |
| `docs/architecture/`  | The system's shape at a glance (+ ADR index)  | For orientation / big-picture     |
| `docs/conventions.md` | Coding conventions all packages follow        | While writing code                |
| `.claude/skills/`     | Recipes for recurring tasks (auto-registered) | When a task matches a recipe      |

You rarely need to feed any of this manually — just reference it and let the agent pull
what it needs.

## Scope a session to fit its context

Big features burn context and produce sprawling, hard-to-review diffs. Instead:

- **Plan first, execute in focused increments.** Have the agent write a short plan
  (e.g. to `docs/plans/<feature>.md`), review it, then build it in a few sessions —
  each producing one green, committed increment.
- **One boundary at a time.** The package boundaries (ADR-0003) are also context
  boundaries. A session that touches `@resonance/db` + `@resonance/auth` loads only
  those — not the whole repo. Prefer "build the data + auth layer" over "build the
  whole feature" in a single session.
- **Stop at green.** Typecheck + lint + test + build passing = a natural session
  boundary and a safe commit point.

## Use what's wired

- **Recipes (skills).** Recurring tasks have a recipe — `scaffold-domain-package`,
  `add-ai-agent`, `add-db-migration`, `add-ui-component-from-figma`,
  `update-architecture-diagram`. If the agent is about to hand-roll one of these,
  redirect it to the recipe so the codebase stays uniform.
- **MCP servers** (`.mcp.json`): **Context7** for current library docs (prefer over the
  model's memory — the stack moves fast), **Figma** for design-to-code, **Neon** to
  inspect the dev schema, **Playwright** to drive/verify the running app.
- **Conventions** (`docs/conventions.md`): Zod at every boundary, RSC + Server Actions
  by default, typed errors, tests with behavior. The agent should match surrounding code.
- **TDD** for features/bugfixes — write the failing test first.

## Session hygiene

- **Branch for feature work** (`feat/<thing>`); the CI gate + `.githooks/pre-commit`
  enforce quality on the way in.
- **Dispatch subagents for exploration** (reading the design, tracing schemas, broad
  searches) so the main thread stays lean and focused on the change.
- **Commit at each green milestone** with a clear message.
- **Verify before claiming done** — run the actual commands (`pnpm typecheck lint test
build`), don't assert success from inspection.

## Prep that makes sessions smoother

- **Credentials:** to _run_ features (not just typecheck/unit-test), fill `.env` from
  `.env.example`. Agents can build and unit/type-test without them; live DB/AI/E2E need
  them.
- **Figma quota:** if the Professional-plan quota has reset, finalize the provisional
  design tokens from the real Figma variables (`packages/ui/CLAUDE.md` has the node ids).

## Keep the framework true (the maintenance contract)

The framework only stays valuable if it's maintained as work lands. Every session that
changes the system should also:

- **New architectural decision** → add an ADR (`docs/adr/`); supersede, don't silently
  contradict.
- **New recurring pattern** → add or update a recipe in `.claude/skills/`.
- **Shape change** (package/service/dependency/data-flow added, or a stub goes real) →
  update the architecture diagram in the same change (ADR-0015, the
  `update-architecture-diagram` recipe).
- **Package shape change** → update that package's `CLAUDE.md`.
- **Stale context is worse than none** — fix it when you notice it.

## Anti-patterns to redirect

- Pasting the whole project history into the first message — unnecessary; reference the
  docs instead.
- Building an entire feature in one marathon session — scope it.
- Hand-rolling something a recipe covers — use the recipe.
- Putting domain logic in `apps/web` — it belongs in a package (ADR-0002).
- Reaching across package internals — import from the public entrypoint only (ADR-0003).
- Letting the diagram or ADRs drift from the code — update them in the same PR.
