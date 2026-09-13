# Optional Firstmate integration

Firstmate is an optional supervisor for overnight or multi-session work.
The [shared workflow](agentic-workflow.md) and ADR-0021 own current behavior;
the earlier per-package shipping model is superseded.

Configure an installation using its current help. Do not assume workstation tools
are installed because a repo file mentions them. The remote branch it clones must
contain the current workflow and required product changes.

## Supervisor contract

- Select independent tasks from the approved feature plan. Package boundaries
  scope work; they do not automatically require separate PRs.
- Name one integration/delivery owner. Start each worker from the exact integration
  commit containing its prerequisites; respect harness limits.
- Prefer warm Treehouse leases if available; native or Git worktrees also work.
- Pass AGENTS.md, relevant package context, accepted decisions, owned files,
  acceptance criteria and the feature measurement id to each worker.
- Workers may use any harness. Claude hooks do not transfer to others.
  Return commits/diffs, test evidence, usage/timing and blockers without pushing,
  opening PRs, starting a gate or closing the parent feature.
- The owner integrates, verifies and delivers once when authorized, following
  [review policy](workflow-review.md).
- Capture each invocation once and wait intervals separately using
  [workflow measurements](workflow-metrics.md). Raw transcripts remain local.

Dependent work starts after prerequisite code is integrated into its base. Only
deliberately separate delivery units require a remote merge checkpoint.
