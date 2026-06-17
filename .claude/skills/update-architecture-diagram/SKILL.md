---
name: update-architecture-diagram
description: Use when an architectural change lands in Resonance — a package or external service is added/removed/renamed, a dependency or data flow changes, or a stub becomes a real implementation. Keeps docs/architecture/resonance-architecture.drawio (the living source of truth, ADR-0015) in sync and regenerates its SVG/PNG outputs.
---

# Recipe: Update the architecture diagram

The architecture diagram in `docs/architecture/` is a source of truth (ADR-0015). It
must change in the **same PR** as the architectural change it reflects.

## When this applies

- A `packages/*` package or external service is added, removed, or renamed.
- A new dependency or data flow appears between components (a new edge).
- A stub/deferred component becomes real (`commerce`, `community`, Vercel Blob, …) —
  drop its dashed/grey styling.
- A new ADR changes the system's shape — reference the ADR number on the node/edge.

## Steps

1. **Edit the source** — `docs/architecture/resonance-architecture.drawio` (draw.io
   XML). Never hand-edit the `.svg`/`.png`; they're generated. Match the existing
   conventions in the file:
   - Tiers are `swimlane` containers; components are `rounded=1` children with coords
     relative to their swimlane.
   - Stubbed/deferred = `dashed=1;fillColor=#f5f5f5;strokeColor=#999999;fontColor=#666666`
     plus a `(stubbed)`/`(deferred)` label. Remove this when a stub goes real.
   - Brand purple `#A855F7` for the app tier; orange for AI; green for data/db and the
     agentic layer; grey for external/neutral.
   - Every edge needs a `<mxGeometry relative="1" as="geometry" />` child.
   - If unsure of draw.io XML mechanics, load the `drawio` skill
     (`~/.claude/plugins/cache/365-skills/drawio/*/skills/drawio-skill/SKILL.md`).

2. **Validate** the structure:

   ```bash
   SKILL=$(echo ~/.claude/plugins/cache/365-skills/drawio/*/skills/drawio-skill)
   cd docs/architecture
   python3 "$SKILL/scripts/validate.py" resonance-architecture.drawio
   ```

3. **Regenerate** the committed outputs (SVG for Markdown embedding, editable PNG):

   ```bash
   drawio -x -f svg -e -o resonance-architecture.svg resonance-architecture.drawio
   drawio -x -f png -e -s 2 -o resonance-architecture.drawio.png resonance-architecture.drawio
   python3 "$SKILL/scripts/repair_png.py" resonance-architecture.drawio.png
   ```

4. **Self-check (if vision available)** — read the regenerated PNG and confirm no
   overlaps, clipped labels, or broken edges. Fix in the `.drawio` and regenerate.

5. **Commit source + outputs together** with the architectural change. If you added an
   ADR, the diagram update belongs in the same PR.

## Notes

- The draw.io desktop CLI must be on PATH (`drawio --version`). If it's missing, the
  `.drawio`/`.svg` still render in any viewer; only regeneration needs the CLI.
- If a change is purely internal to one package (no new component, dependency, or data
  flow), the diagram does not need to change — don't churn it.
