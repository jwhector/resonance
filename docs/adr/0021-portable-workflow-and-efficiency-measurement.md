# ADR-0021: Portable workflow and feature efficiency measurement

- **Status:** Accepted — amended 2026-09-13 (see Amendment)
- **Date:** 2026-09-13
- **Supersedes:** ADR-0016 sections 1, 3 and 4 (orchestration, gate layering, review surface).
  Its knowledge-ownership decision remains in effect.

## Context

The workflow prescribed a PR and review for every package task, while its hooks and
model defaults differed across harnesses. Repeated fix/review rounds and metadata
changes could dominate small tasks. Documentation promised automatic checks and
low-cost routing that local configuration did not guarantee.

## Decision

Use a harness-neutral workflow with native adapters. One integration owner delivers
a coherent feature as one PR by default; independently shippable parts may use separate
PRs. Helpers build bounded scopes and return evidence without their own shipping gate.
Optional orchestration or visual tools are not prerequisites for development.

Formal reviewers use high-effort Opus for Claude or Terra for GPT. Auth/payment/
credential/security work also gets the other model's independent cross-check.
If required models are unavailable, complete local work and ask before substitution.
Keep personal gate settings operator-owned and document the external configuration
boundary. Accepted user decisions do not require repeated approval.

Commit sanitized feature measurements with planned S/M/L complexity and risk,
Git change size, invocation tokens, active/wait intervals and review repeat reasons.
Raw logs remain local. Use coverage-aware comparisons rather than token-per-line
targets; missing evidence never becomes zero. The audit-workflow skill audits these
records across harnesses and can also be installed personally.

## Consequences

Integration ownership reduces duplicate reviews but makes integration testing and
accurate dependency handoff essential. Independent CI remains valuable even when
local checks passed. Model quality is explicit; cheap formal review is no longer a
goal. Setup may need operator action because repo role files do not configure an
external gate. Measurements add a small recording cost and require honest coverage.

This changes development tooling, not product architecture; no runtime diagram
changes are needed. The operative rules live in docs/agentic-workflow.md and its
review/measurement references.

**Amendment (2026-09-13) — the reviewer-model pause is dropped.** The decision said
to ask before substituting an unavailable reviewer model. In practice the external gate
neither pins nor reports the model it resolved, so the question could not be answered
with evidence, and when asked it was waved through. The rule is now: run, record the
resolved model (null when unknown), report the gap or substitution, and keep such runs
out of baselines. The
model requirement itself and the second-model cross-check for high-risk work stand.
Operative text: [workflow-review.md](../workflow-review.md).

## Alternatives

One PR per package makes task boundaries dictate delivery overhead. A mandatory
single harness excludes existing tools. Global model edits committed implicitly
would affect unrelated repositories. Comparing tokens solely to lines changed
rewards code volume and hides difficult small fixes. These alternatives were rejected.
