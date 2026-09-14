# Working in Resonance

Read [CLAUDE.md](CLAUDE.md) for product and package rules, then
[docs/agentic-workflow.md](docs/agentic-workflow.md) for the shared development workflow.
The filename CLAUDE.md is historical: its product rules apply to every harness.
Read a package's CLAUDE.md only when working in that package.

Use the active harness's tools and permissions. Claude hooks do not automatically
run in Codex or other harnesses. Missing optional tools do not prevent local work;
report missing evidence before shipping. Ask about materially ambiguous choices.

For a feature, follow [.claude/skills/feature/SKILL.md](.claude/skills/feature/SKILL.md).
For token/time efficiency audits, use
[.agents/skills/audit-workflow/SKILL.md](.agents/skills/audit-workflow/SKILL.md).
Recipes can be read directly if the harness does not discover their directory.

One integration owner submits the feature to the shipping gate. Builders and
validation-step agents do not start nested pipelines or push independently.
Formal reviewer model requirements and the high-risk second review are defined in
[docs/workflow-review.md](docs/workflow-review.md).
