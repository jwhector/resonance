# Workflow measurements

The integration owner records a feature once, across helpers, gate runs and retries.
Committed records live in `workflow/metrics/<feature-id>/`. Raw transcripts, logs,
screenshots and export intermediates stay local under ignored `.workflow-local/`.
No background transcript scanner or upload is installed.

## Start before building

```sh
pnpm workflow:metrics start resonance-1234 M normal HEAD
```

Use the actual starting/integration commit as base. Record size before execution:
S = one bounded behavior with known seams; M = several connected behaviors or an
interface change; L = a broad feature with multiple dependencies or major unknowns.
Risk is `high` for auth, payments, credentials or security, otherwise `normal`.
These categories are planning judgments, not hours promised or developer scores.
Keep their rationale and acceptance criteria in the existing task/plan. Ask the user
if sizing or scope is ambiguous. If measurements start late, keep coverage partial.

## Record each invocation or interval

Write an allowlisted JSON event to a local temporary file, then:

```sh
pnpm workflow:metrics record resonance-1234 .workflow-local/review-1.json
```

Example (replace identifiers, timestamps, SHA and model evidence with actual values):

```json
{
  "id": "review-1",
  "invocation": "call-001",
  "worktree_dirty": false,
  "phase": "review",
  "reason": "initial",
  "run": "gate-001",
  "head": "1111111111111111111111111111111111111111",
  "harness": "codex",
  "requested_model": "gpt-5.6-terra",
  "resolved_model": null,
  "effort": "high",
  "started_at": "2026-09-13T12:00:00.000Z",
  "ended_at": "2026-09-13T12:07:00.000Z",
  "source": "gate",
  "tokens": null,
  "outcome": "passed"
}
```

Events are immutable and unique by event id and harness/invocation. Use invocation
ids for individual model calls or non-overlapping session segments, not an entire
session id repeated for every turn. Do not record both an aggregate gate duration
and its contained model calls as active work. If detailed timings are unavailable,
record the aggregate once and disclose the lost phase/round detail. When one call
covers document+lint, assign it to document once, not both.

Fields:

- `phase`: plan, explore, build, review, fix, test, document, lint, integrate, ci,
  wait, or audit. A formal review pass uses review; fixing findings uses fix.
- `reason`: initial, fix, conflict, new-code, cross-check, restart, feedback, human,
  queue, merge, or setup. Record why review repeats, not simply that it repeated.
- `run`: opaque gate/run id linking retries; `head`: full candidate commit SHA.
- `worktree_dirty`: true when uncommitted changes were present. For development
  events, head is then the checkout baseline, not a proof of the tested source.
  Formal review evidence qualifies only for a clean, exact candidate commit.
- `harness`: actual executor; use `none` for a deterministic command or human wait.
  Model and effort can be null if unknown. Requested model is not proof of resolved model.
- `source`: harness, gate or manual (manual means transcribed observation, not estimate).
- `outcome`: passed, findings, failed, cancelled, completed or skipped.
- `tokens`: null when unavailable; otherwise all four nonnegative counters:
  `input_uncached`, `input_cached`, `cache_write`, `output`.
  Each bucket is disjoint. Reasoning already included in output is not added again.
  A known zero is zero; an unknown count is null for the whole token object.

Normalize source-specific usage before recording. For Codex, subtract cached input
from inclusive input and use **deltas**, not a sum of cumulative session totals.
For Claude, preserve separately reported uncached input, cache reads, cache creation
and output. Do not add stream updates and final usage for the same call. Parent
totals that include child usage must not be added to child totals again. For other
harnesses, inspect their accounting semantics; unknown semantics means missing data.

Use only specifically task-linked logs/exports, and inspect usage fields rather than
dumping transcripts. Unknown fields are rejected by the recorder. Check identifier
and model fields for secrets before committing: structural validation cannot detect
a secret disguised as an identifier. Do not put prompts, finding descriptions,
usernames, absolute paths, credentials or arbitrary metadata in metric records.

Record gate review/fix rounds from the gate's actual history, not its number of step
rows. `no-mistakes axi status` and `axi logs --step review` are useful read-only
sources. A CI monitor waiting days for merge belongs to wait/ci, not model-active time.
If a source only provides duration, do not invent exact timestamps; retain the source
locally, report the gap, and leave the feature partial.

## Finish and audit

After committing the feature candidate:

```sh
pnpm workflow:metrics finish resonance-1234 HEAD validated partial
pnpm workflow:metrics validate
pnpm workflow:metrics audit
```

Outcomes: validated, shipped, blocked or cancelled. Complete coverage requires all
task-linked agents, phases, retries and waits accounted for; otherwise use partial.
Do not mark complete solely because all _recorded_ invocations have token counts.
Unavailable token counts remain visible even with complete timing coverage.
A later delivery outcome can update the feature summary without duplicating events.

Git size is measured between recorded base/head commits: files, packages/apps,
added/deleted lines and binaries. Metric records themselves are excluded to avoid
self-inflation. This is a committed snapshot; uncommitted work is not included.
`snapshot <base> <head>` inspects this size without creating a feature record.

Reports distinguish elapsed time, union of active intervals (parallel overlap counted
once), summed agent time, wait-only time and unobserved gaps. Tokens are summed once
across disjoint buckets. Missing coverage produces a lower bound, not a complete total.
Tokens per 100 changed lines and minutes per changed file are context, not scores:
a tiny difficult fix can legitimately cost more than generated scaffolding.

Compare completed features within size/risk cohorts, then consider packages, churn,
behavioral complexity and verification outcomes. Cohort medians become a tentative
baseline only after five complete timing/token samples. No baseline is prefilled.
A fast run with missing verification is not an improvement. Baselines require
qualifying review evidence on the final candidate, including the second model for
high-risk changes; unknown or mismatched reviewer models remain visible. No dollar estimate is
reported without actual billed usage or dated model pricing with cache semantics.
