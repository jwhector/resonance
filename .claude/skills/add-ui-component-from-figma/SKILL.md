---
name: add-ui-component-from-figma
description: Use when building a UI component in @resonance/ui from the Figma design — a primitive (button, input) or a bespoke composite (Post card, Weave rail). Pulls the design via the Figma MCP, builds on owned shadcn/Radix primitives, and styles strictly with design tokens (ADR-0012).
---

# Recipe: Add a UI component from Figma

Components live in `@resonance/ui` and are styled **only** with design tokens — never
hard-coded colors/sizes. Accessibility comes from the owned shadcn/Radix primitives.

**Deep-module framing.** A component is a **module** and its **props are the interface** —
keep that prop surface small, with the accessible behaviour (ARIA, focus, keyboard
handling from the owned Radix primitives) hidden behind it as the **implementation**. A
sprawling prop list is a **shallow** component: an interface nearly as wide as what it
renders, leaking layout decisions onto every caller. Prefer a variant over one more
boolean, and hide complexity inside. Vocabulary and rule:
[`conventions.md` § Module design](../../../docs/conventions.md) and
[ADR-0017](../../../docs/adr/0017-design-deep-modules.md).

## Loop bracket (seeds + mulch)

This recipe runs inside the agentic loop (root CLAUDE.md → _Agentic workflow_, ADR-0016):

- **Before you start** — claim the seed (`sd ready` → `sd update <id> --status in_progress`), confirm the **Figma MCP is authorized** (`/mcp`), and load prior learnings with `ml prime ui`.
- **When you finish** — the component is **not done until Step 8 (artifact-anchored pixel verification) passes** (ADR-0019). Then record anything non-obvious to the **`ui`** mulch domain (`ml record ui --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`), push through the no-mistakes gate, and `sd close <id>`.

> **The golden rule (ADR-0019).** The Figma frame is the source of truth — **read it, don't
> invent.** Every past drift came from an assumption standing in for the design and then
> self-certifying as "reconciled." Parity is a _diff of two images_, never a prose claim.

## Steps

1. **Read the design — cheap→expensive, and save the artifacts.** Walk the Figma budget
   funnel (ADR-0019): `get_metadata(fileKey[, node])` to map the frame and **prove the node
   id exists** (save the dump under `design/manifest/metadata/` — R1), then
   `get_screenshot` (save the render as the component's/screen's `design.png` — this is the
   contract), and only then `get_design_context` on that one frame for resolved
   hexes/spacing/type (save as `design.md`). **Do not explore with `get_design_context`.**
   The file/page/node ids are in `packages/ui/CLAUDE.md` and `design/manifest/_index.md`.
   - **If Figma is rate-limited:** you may build against `packages/ui` tokens + a saved
     `design.png`, but every unverified value stays **`PROVISIONAL`** in code and
     `status: provisional` in `_index.md` (R3). It is **not** "reconciled" until Step 8
     clears it against the artifact — do not launder a guess into "done."

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

7. **Code Connect (R4):** add/update the component's `.figma.ts` so the node↔component map
   is machine-checked at build (a wrong id fails to publish), replacing docstring citations.

8. **Verify against the artifact — MANDATORY (R2, ADR-0019).** A component is not done on a
   claim; it is done when `app.png` matches `design.png`.
   - Render the component at its route in the running app (`E2E_HARNESS=1 pnpm --dir apps/web
dev`) and capture it: `node apps/web/scripts/capture-route.mjs <route> <out.png>` (or
     `capture-app-manifest.mjs` for a full slice). Warm-retry once if the first authed nav
     times out (Next cold-recompiles).
   - **Diff `app.png` vs `design.png` — visually AND by pixel-sampling.** Perception lies
     (opacity, disabled tints, near-grays fool the eye); sample the actual bytes with `sharp`
     to confirm hexes: e.g.
     `node -e "const s=require(require.resolve('sharp',{paths:['apps/web']}));s('<png>').extract({left:X,top:Y,width:1,height:1}).raw().toBuffer().then(b=>console.log(b[0],b[1],b[2]))"`.
   - Iterate to zero drift, then write/update the screen's `parity.md`: _"matches `design.png`
     except [deltas]"_, with every delta **resolved or explicitly accepted** (a frame artifact
     or a deferred asset is named, never silently reproduced or dropped). Update `_index.md`
     status. A bare "reconciled to Figma" is not a permitted claim.

## Reference

The Weave rail and profile panels from the reference slice (ADR-0013) are the
canonical composites; the shadcn primitives under `packages/ui/src/primitives/` are
the canonical primitives.
