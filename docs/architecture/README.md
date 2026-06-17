# Architecture Diagram — Living Source of Truth

This directory holds the visual architecture of Resonance. It is **documentation,
not decoration**: the diagram is kept in sync with the code and the ADRs, and is
treated as one of the project's sources of truth (ADR-0015).

## Files

| File                                | Role                                                      | Edit?         |
| ----------------------------------- | --------------------------------------------------------- | ------------- |
| `resonance-architecture.drawio`     | **Source of truth.** Editable draw.io XML. Diff-friendly. | ✅ Edit this  |
| `resonance-architecture.svg`        | Generated. Embed in Markdown / view in browser.           | ❌ Regenerate |
| `resonance-architecture.drawio.png` | Generated. Editable PNG (embedded XML) for sharing.       | ❌ Regenerate |

![Resonance architecture](./resonance-architecture.svg)

## What it shows

Five tiers, top to bottom, plus a cross-cutting layer:

1. **Clients** — Creator and Member (web, desktop-first responsive).
2. **`apps/web`** — the Next.js App Router shell (RSC pages, Server Actions, route
   handlers, the Weave UI). A thin layer that composes and renders packages.
3. **`packages/*`** — framework-agnostic domain & platform logic (the monorepo core).
   Stubbed packages are dashed/grey; the AI package is highlighted.
4. **External services** — Neon Postgres + pgvector, Vercel AI Gateway (→ Claude,
   Voyage), Stripe Connect, Resend; Vercel Blob is deferred.
5. **Agentic Engineering Layer** — how agents work in this repo: CLAUDE.md hierarchy,
   ADRs, recipes, hooks + CI, MCP servers, and this diagram itself.

Each element maps to an ADR; the diagram is the visual index of the ADR set.

## Update protocol (keep it true)

The diagram is only useful if it stays accurate. **When an architectural change lands,
the diagram changes in the same PR** — same discipline as updating an ADR.

Trigger → action:

- **New/removed/renamed package or external service** → add/remove/rename its node.
- **New dependency or data flow between components** → add/adjust the edge + label.
- **A stub becomes real** (e.g. `commerce`, `community`, Vercel Blob) → remove the
  dashed/grey "stubbed/deferred" styling.
- **A new ADR changes the shape of the system** → reflect it here and reference the
  ADR number on the affected node/label.

How to update (the `update-architecture-diagram` recipe automates this):

```bash
SKILL=~/.claude/plugins/cache/365-skills/drawio/*/skills/drawio-skill
cd docs/architecture

# 1. Edit the source
$EDITOR resonance-architecture.drawio

# 2. Validate structure
python3 $SKILL/scripts/validate.py resonance-architecture.drawio

# 3. Regenerate deliverables (SVG for docs + editable PNG)
drawio -x -f svg -e -o resonance-architecture.svg resonance-architecture.drawio
drawio -x -f png -e -s 2 -o resonance-architecture.drawio.png resonance-architecture.drawio
python3 $SKILL/scripts/repair_png.py resonance-architecture.drawio.png
```

Then commit source + regenerated outputs together. See `.claude/skills/update-architecture-diagram/`.

> Generated with the `drawio` skill (draw.io desktop CLI). The `.drawio` XML is the
> editable source; never hand-edit the SVG/PNG.
