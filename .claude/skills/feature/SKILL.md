---
name: feature
description: Plan and build a Resonance feature across packages, using independent helpers when useful and one integrated PR by default. Use for new features, vertical slices, or substantial multi-package changes.
---

# Build a feature

Follow [the shared workflow](../../../docs/agentic-workflow.md), regardless of harness.

## Plan

Resolve scope and consequential ambiguity with the user. Reuse a Seeds task/plan;
define acceptance criteria, package interfaces, dependencies and early-exit conditions.
Record planned S/M/L complexity and risk using
[the measurement protocol](../../../docs/workflow-metrics.md).
Obtain approval for substantial plans unless the user already authorized that plan.
Use conversation or available visual tooling; no particular plugin is required.

## Execute

One owner builds inline or delegates independent scopes using available native tools.
Default to one integration branch and one PR; plan children are work units, not PR
units, so independent siblings share that branch and gate. Each builder receives the exact base,
owned paths, interface contract and tests expected. Builders return changes, evidence,
and usage/timing identifiers; they do not ship or start no-mistakes. Recipes' delivery
instructions belong to the integration owner, not every invocation of a recipe.
Integrate prerequisite code before dependent work; use merge checkpoints only for
dependencies deliberately delivered in separate PRs. Avoid parallel tracker/lockfile edits.

The owner verifies integrated behavior, updates relevant docs, records learnings and
measurements so they ride the same candidate, and submits once to the shipping gate
when authorized with scope and standing consents stated in `--intent`. Follow
[review policy](../../../docs/workflow-review.md) for Opus/Terra, second-model reviews,
fix rounds and the external no-mistakes configuration boundary.

## Handoff

Present acceptance results, remaining decisions, measured review count and reasons,
time/token coverage, and PR status. Apply requested feedback without discarding prior
gate fixes. Save useful learnings and sanitized metrics; close work that is actually done.
