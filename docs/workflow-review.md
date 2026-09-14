# Formal review ownership and models

The integration owner submits one coherent feature to no-mistakes. Builder self-checks,
formatting, tests, plan feedback and visual inspection are not extra formal code reviews.
Read [review-checklist.md](review-checklist.md) for repo-specific dimensions.

## Model requirement

| Reviewing harness/provider | Requested model      | Reasoning effort |
| -------------------------- | -------------------- | ---------------- |
| Claude                     | `opus` (Opus family) | `high`           |
| Codex / GPT                | `gpt-5.6-terra`      | `high`           |

These requirements apply to formal review, including fresh rereview after fixes.
Builders keep the selected harness's normal model unless the user chooses otherwise.
Record requested and actually resolved model/effort separately; aliases and account
policies can substitute models. An unknown resolved model is missing evidence.
Do not silently downgrade or force every builder to use the reviewer model.

Auth, payment, credential and security changes require an independent second model
on the same final candidate: Opus plus Terra. This is one primary gate and one scoped
cross-check, not two complete shipping pipelines. Reviewers work independently;
the owner reconciles findings and records disagreements. If reconciliation changes
code, obtain current evidence from both reviewers for the final candidate. Preserve
accepted decisions in the handoff so rereviews do not reopen them without new evidence.

When the gate cannot pin or report its resolved model, or reports a model other than
the required one, run it anyway, record the actual `resolved_model` (`null` when
unknown), and name the substitution or gap in the handoff; do not stop to ask. That
handoff disclosure is what keeps a downgrade from being silent. An unpinned reviewer is
an accepted operating state until the operator pins one, and an unknown or substituted
resolved model keeps the run out of baselines ([workflow-metrics.md](workflow-metrics.md)).
The one case that still pauses is a high-risk change whose second-model cross-check has
no available provider at all.

## Native role adapters

Claude can select `.claude/agents/reviewer.md`; Codex can select
`.codex/agents/reviewer.toml`. Other harnesses can read the same checklist and invoke
the required provider model through their supported interface. Roles return findings
only. They never start a pipeline, push, merge, or spawn more reviewers.
These definitions do not reconfigure no-mistakes' own subprocesses.

## Local no-mistakes setup (operator-owned)

No global settings are changed by this repo. Before using the gate, inspect
`no-mistakes doctor`, its installed help, and the local global config. The calling
harness is not the pipeline harness: `agent: auto` can choose Claude even when Codex
is driving AXI. To choose explicitly, the operator selects `agent: claude` or
`agent: codex` in their global no-mistakes configuration and merges:

```yaml
agent_config:
  claude:
    model: opus
    effort: high
  codex:
    model: gpt-5.6-terra
    effort: high
```

This supported setting is **per harness, not per pipeline step**, so it also affects
other no-mistakes agent phases and other repos using that global config. Existing
`agent_args_override` flags take precedence: inspect and reconcile them explicitly.
Do not add unsupported repo-level `agent_config` or claim reviewer-only routing.
Check the actual run's model evidence after setup. If cheaper housekeeping is desired,
first add or verify step-specific support in the external gate; do not invent flags.

## Driving gate questions

The gate parks on `ask-user` findings. Escalate one only when it changes product
behaviour, a design choice, or scope; decide the rest yourself and list each decision in
the handoff. Trivially decidable findings include deleting dead code with no callers,
formatting, and a no-live-surface verdict on a change that touched nothing runnable.
Head them off in `--intent`: state the change's scope (contract-only, docs-only), say a
no-live-surface verdict is expected when that is true, and pre-authorize removing dead
code the reviewer finds. The reviewer reads the intent; whether the gate's own triage
honours standing consents is a tool question, so the intent line is guidance to the
reviewer, not a switch.

## Extra rounds and stopping

- Initial review: once per independently shipped feature candidate.
- Requested fixes: one fixer round followed by fresh review. Group compatible
  findings into a round; preserve valid decisions and test evidence.
- Rebase/conflict repair: revalidate as required by no-mistakes. A changed candidate
  can invalidate earlier evidence even if the task name stayed the same.
- A terminal failure can justify a fresh run. An active gate or quiet CI monitor
  does not: inspect status and drive the existing run instead of restarting it.
- After two unsuccessful repair rounds, the owner reassesses recurring findings
  and reports the cause and next approach. This is a diagnosis checkpoint, not
  automatic approval or a cap that discards correctness/security blockers.
- Minor optional polish does not block shipping. A documentation or tracker error
  that changes behavior, scope or future instructions can be a real blocker.

Record every formal pass, fixer invocation and repeat reason with the feature/run
and candidate commit. Count the second-model cross-check separately from retries.
Missing CI checks are not green; skipped or unavailable verification is explicit.

Sources for adapter syntax: [Claude subagents](https://code.claude.com/docs/en/sub-agents),
[Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents).
The installed no-mistakes global config/help owns its version-specific settings.
