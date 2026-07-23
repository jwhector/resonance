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

- Working file key: `UYlkCL7jkCVgKWiqAVlEFp` (moved into the **Pro-tier** team — the Figma MCP
  quota is **per team, not per user**, so a Starter-team file caps fast even if you hold Pro
  elsewhere). Original: `7FOYLdtzCTITjcPeGKwF31`. Node ids survive Figma copies/moves. If
  `get_screenshot`/`get_metadata` drop after a cap or reconnect, use `download_assets` (savable
  render URLs) + `get_design_context`. (mulch `architecture`)
- **Design fidelity:** match UI to Figma via `design/manifest/` (design.png ⇄ app.png, zero
  drift; the frame is the source of truth, never an assumption). See `design/manifest/README.md`
  - `_index.md`; codification tracked in `resonance-042f`.
- Design System page: node `252:288` (Brand `1509:75825`, Gray Scale `1509:75822`,
  Indicators `1509:75823`, Fonts `1429:46784`)
- **Reading tokens:** `get_variable_defs` is selection-gated in this setup (it reads the
  desktop selection, ignoring `nodeId` → "nothing selected"). Use **`get_design_context`
  on a specific frame** instead — the returned code carries resolved hexes / font specs.

## Token fidelity — colors + type are EXTRACTED

Colors and typography are **extracted** (from `get_design_context` on the color

- Fonts frames above). Two things to know:

* **The neutral ramp is inverted:** `gray-0` = black … `gray-900` = white. Semantic roles
  are mapped from the ramp's Figma labels (Text=`gray-300` `#2b2b2b`, Subtext=`gray-600`
  `#a6a6a6`, Border=`gray-700` `#cdcdcd`, Background=`gray-800` `#f2f2f2`).
* **Font family is "Helvetica Neue"** (not Inter). Type scale + weights (400/500/700) are
  in `theme.css` (`--text-*`) and mirrored in `tokens/`.

Still design-consistent **defaults** (the design system ships no explicit token frame for
these): border radius, elevation/shadows, and the `*-subtle` semantic tints.

## Testing

React Testing Library (`*.test.tsx`) — render, interactions, a11y roles (ADR-0011).

## Working here (seeds + mulch)

Work in this package is tracked by a `ui`-labelled seed — `sd ready` / `sd search ui` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`ui`** mulch domain: `ml record ui --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
