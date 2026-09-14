# Working with agents in this repo

Start with [AGENTS.md](../AGENTS.md) and [CLAUDE.md](../CLAUDE.md).
The [shared workflow](agentic-workflow.md) owns planning, delegation, delivery and
checks across harnesses. This guide covers session hygiene.

- State outcomes and constraints; ask about consequential ambiguity early.
- Load only relevant package context and Mulch domains. Read ADRs when changing
  their decisions. Reuse context already injected.
- Plan substantial work in Seeds; work inline for small tasks. Scope helpers by
  independent files/interfaces and return evidence to the integration owner.
- Read recipes in .claude/skills directly if native discovery is unavailable.
  The directory name does not restrict their use to Claude.
- Test changed behavior and exercise affected flows. Use the verification recipe
  for UI parity and live behavior; distinguish real execution from test doubles.
- Reuse valid checks unless changes or failures invalidate them. The shipping gate
  owns formal review; CI independently checks the published commit.
- Record useful discoveries and maintain package context; avoid ritual memory.
- Record [workflow measurements](workflow-metrics.md) and use audit-workflow to
  identify evidence-backed improvements.

Claude loads CLAUDE.md and its configured hooks natively. AGENTS.md readers get the
same rules via pointers. Other tools can read these files directly. Check actual
tool/model availability before claiming automation ran; see [review setup](workflow-review.md).
