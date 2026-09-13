---
name: audit-workflow
description: Audit recorded agent workflow measurements to compare token usage, development time, review repetition and coordination overhead against feature size and risk. Use for workflow-efficiency questions or periodic friction audits, not ordinary code review.
---

# Audit workflow efficiency

Locate the target repository from the user's context. Read its measurement protocol
and run its read-only audit command when present. In Resonance these are
`docs/workflow-metrics.md` and `pnpm workflow:metrics audit`. Do not assume a personal
installation's directory is the repository, or that every repository uses this schema.

1. Establish the requested feature/time range and read only its sanitized records.
   Ask about ambiguous scope or size categories. If no measurements exist, state
   that there is no baseline; propose collection using the repo protocol rather
   than manufacturing token or timing estimates.
2. Check completeness before comparing: task-linked helpers, retries, rejected runs,
   requested/resolved models, token accounting semantics and waits. Distinguish
   unknowns from zero, observed lower bounds from complete totals, and configured
   models from the models actually used. Do not silently drop failed attempts.
3. Compare features of similar planned S/M/L complexity and risk. Use changed
   packages/files/lines as additional context, never as a productivity score.
   Compare elapsed time, active wall time, summed agent time, token coverage,
   review/fix counts and repeat reasons. Separate human/merge/queue wait from work.
4. Identify supported causes: repeated context loads, unnecessary helper launches,
   duplicate formal reviews, repeated suite runs on unchanged commits, repair loops
   or documentation churn. A large number alone does not prove inefficiency.
   Cross-check requirements and quality outcomes before recommending fewer checks.
5. Give concrete findings with feature/event ids, measurement coverage and comparison
   cohort size. Say when a baseline is too small or unrepresentative. Recommend at
   most three prioritized experiments and their success measures, preserving review
   model requirements and risk-based verification. Explain in plain language.
6. Reading or reporting is not authorization to change workflow policy, install tools,
   edit tracker state, read unrelated private sessions, or launch new paid model
   reviews. Ask before substitutions or consequential ambiguous choices.

Use narrowly task-linked local usage exports only when sanitized records cannot
answer the question and access is authorized. Extract usage/time fields without
printing prompts or raw transcripts. Do not double-count cumulative counters,
streamed/final usage, parent-inclusive child totals, or overlapping active intervals.
Keep raw logs local. Missing model usage is an explicit evidence gap.

The audit itself consumes resources: record it as an audit event when the repo has a
collector and exact usage/timing is available. Avoid spawning a fleet just to inspect
small metric files. A proposed optimization should save more than measuring it costs.
