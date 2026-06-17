# @resonance/ui — Design System

The Resonance design system: design tokens + accessible primitives + bespoke
composites. Consumed by `apps/web` and any future client. ADR-0012.

## What's here

```
src/
├── styles/theme.css      Tailwind v4 CSS-first tokens — THE source of truth for the UI
├── tokens/index.ts       Typed mirror of the tokens (for non-CSS use: charts, emails)
├── lib/cn.ts             cn() class-merge helper (the one way to compose classes)
├── primitives/           Owned shadcn/Radix primitives (Button is the canonical example)
└── components/           Bespoke composites (Post card, Weave rail, …) — to be built
```

The app imports `@resonance/ui/styles.css` (tokens + Tailwind) and components from
`@resonance/ui`.

## Rules

- **Style with tokens only.** Use Tailwind utilities generated from `theme.css`
  (`bg-primary`, `text-foreground`, `rounded-lg`, `shadow-brand`, …). Never hard-code
  a hex or px in a component. If a token is missing, add it to `theme.css` first.
- **Primitives wrap Radix** (via shadcn) for accessibility. Don't re-implement focus
  traps / ARIA. Composites build on primitives — don't reach below them.
- **Follow the Button pattern** for new primitives: `cva` variants + `asChild` via
  Radix `Slot` + `cn()`. Export from `src/index.ts`.
- Build UI from the design with the `add-ui-component-from-figma` recipe.

## Figma source

- File key: `7FOYLdtzCTITjcPeGKwF31`
- Design System page: node `252:288` (Brand `1509:75825`, Gray Scale `1509:75822`,
  Indicators `1509:75823`, Fonts `1429:46784`)

## ⚠️ Token fidelity — refine when Figma quota allows

The brand primary (`#A855F7`) and the 6-stop gradient are **extracted and final**. The
neutral ramp, semantic colors, the type scale's px values, the font family (currently
`Inter`), radii, and shadows are **provisional** — the Figma Professional-plan View-seat
quota blocked deep variable reads during scaffolding. To finalize:

1. `get_variable_defs` on `252:288` → exact color/spacing/radius variables.
2. `get_design_context` on `1429:46784` (Fonts) → real font family + type sizes.
3. `get_design_context` on the color frames → neutral + semantic hexes.

Then replace the `PROVISIONAL` values in `theme.css` (and the mirror in `tokens/`).
The local file `.tmp-figma-tokens.md` (gitignored, repo root) has the full extraction
notes and exact node ids.

## Testing

React Testing Library (`*.test.tsx`) — render, interactions, a11y roles (ADR-0011).
