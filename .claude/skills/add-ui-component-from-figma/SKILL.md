---
name: add-ui-component-from-figma
description: Use when building a UI component in @resonance/ui from the Figma design — a primitive (button, input) or a bespoke composite (Post card, Weave rail). Pulls the design via the Figma MCP, builds on owned shadcn/Radix primitives, and styles strictly with design tokens (ADR-0012).
---

# Recipe: Add a UI component from Figma

Components live in `@resonance/ui` and are styled **only** with design tokens — never
hard-coded colors/sizes. Accessibility comes from the owned shadcn/Radix primitives.

## Loop bracket (seeds + mulch)

This recipe runs inside the agentic loop (root CLAUDE.md → _Agentic workflow_, ADR-0016):

- **Before you start** — claim the seed (`sd ready` → `sd update <id> --status in_progress`), confirm the **Figma MCP is authorized** (`/mcp`), and load prior learnings with `ml prime ui`.
- **When you finish** — record anything non-obvious to the **`ui`** mulch domain (`ml record ui --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`), push through the no-mistakes gate, then `sd close <id>`.

## Steps

1. **Read the design.** Use the Figma MCP (`get_design_context` / `get_screenshot` /
   `get_metadata`) on the component's node to get its structure, spacing, and the
   exact token values it uses. The file/page ids are in `packages/ui/CLAUDE.md`.
   (If the Figma plan is rate-limited, work from `packages/ui` tokens + the screenshot
   and reconcile later — note any guessed values.)

2. **Classify it:**
   - **Primitive** (button, input, dialog, dropdown) → it should wrap/extend an owned
     shadcn primitive in `packages/ui/src/primitives/`. If the primitive doesn't exist
     yet, add it with the shadcn CLI into the repo, then restyle.
   - **Composite** (Post card, Weave rail, profile panel) → compose primitives in
     `packages/ui/src/components/`. Do not re-implement primitive behavior.

3. **Style with tokens only.** Reference CSS variables / Tailwind classes generated
   from `packages/ui` tokens (`bg-brand`, `text-muted`, `rounded-card`, etc.). If a
   needed token doesn't exist, add it to the token source first — don't inline a hex.

4. **Props & types.** Typed props; variants via the project's variant helper (cva or
   equivalent used in `ui`). Export from `packages/ui/src/index.ts`.

5. **Accessibility.** Keep the primitive's ARIA/focus behavior intact. For composites,
   ensure keyboard navigation and labels; don't strip what Radix provides.

6. **Test** (ADR-0011): React Testing Library — render, key interactions, a11y roles.

7. **Code Connect (optional):** if maintaining Figma↔code mapping, add/update the
   component's `.figma.ts` so the design references the real component.

## Reference

The Weave rail and profile panels from the reference slice (ADR-0013) are the
canonical composites; the shadcn primitives under `packages/ui/src/primitives/` are
the canonical primitives.
