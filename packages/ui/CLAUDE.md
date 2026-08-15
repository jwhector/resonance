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
└── components/           Bespoke composites (onboarding cards, search, Weave rail — see § Composites)
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
- **Adding a `--text-*` token means editing `lib/cn.ts` too.** tailwind-merge only knows
  Tailwind's stock font sizes and classifies every other `text-*` as a _colour_, so an
  unregistered size is silently dropped whenever a text colour merges alongside it — and the
  colour is dropped when the order reverses. `cn.ts` carries the scale in `FONT_SIZES`; keep it
  in sync with `theme.css` or the token will look applied and render at the inherited size.
- **Figma strokes draw _inside_ the padding box; CSS borders add outside it.** A frame the
  inspector reports as "42px tall, 12px padding, 2px stroke" is 12+18+12 in Figma but
  12+18+12+4 in CSS. Subtract the border width from the padding (`p-2.5` + `border-2`, `p-5.75`
  - `border`) or every bordered box ships a few pixels too large. `tagVariants` and
    `TopicPicker`'s panel both carry a note saying so.
- Build UI from the design with the `add-ui-component-from-figma` recipe.

## Composites

The onboarding family (`create-account-card`, `email-verify-card`, `intent-picker-card`,
`topic-picker`) shares one shape: a centred column on the white page, the `ResonanceMark`
over a heading block, then a form ending in a `Button size="wide"`. They are all
presentational — local form state at most, never data or routing.

- **`IntentPickerCard`** — the "What brought you?" fork (Figma `1519:78312`, manifest screen
  `01-what-brought-you`). The three intents are `@resonance/core`'s vocabulary, not this
  package's: `OnboardingIntent` is re-exported from core so callers keep one name for it, and
  `INTENT_OPTIONS` is built from core's `ONBOARDING_INTENTS`. Only the per-option wording is
  local, because the design owns it and core does not.
- **`TopicPicker`** — the member's interest selection step (Figma `1554:79520`, manifest
  screen `13-select-topics`). A **controlled** composite over `@resonance/core`'s `Topic`:
  the caller owns the topic list and the selection. Two things about it are load-bearing and
  easy to undo by accident: **Continue is never gated on a count** (the step is skippable and
  `MemberInterestsSchema` takes a minimum of zero — the heading's "3" is copy), and **each
  chip is a real `<input type="checkbox">`** inside a `<fieldset>` rather than a styled div,
  which gives it keyboard operation and screen-reader semantics. **Native submission is
  opt-in:** pass an `action` and the checked chips POST their slugs as `FormData` (a plain
  form POST or a Server Action, working without JS); without an `action` the picker is purely
  controlled and submission is intercepted, firing only the `onSubmit` callback.

`tagVariants` (in `primitives/tag.tsx`) is exported alongside `Tag` because the chip's look
and the chip's semantics have different owners — a read-only chip is a `listitem`, a chip that
toggles a choice must be a form control. Compose `tagVariants` onto the right element rather
than adding a second chip that drifts.

## Figma source

- **Which file to trust, and how to capture, live in the manifest — not here.** The source
  file is owned by [`design/manifest/PROVENANCE.md`](../../design/manifest/PROVENANCE.md) and the
  capture procedure by [`design/manifest/README.md` § Capture notes](../../design/manifest/README.md).
  Short version: the REST path (`get_screenshot`/`get_metadata`/`download_assets`/`get_design_context`)
  returns **`403`** and is dead — capture through the **Figma Desktop Bridge** (`figma_execute` +
  `node.exportAsync`). Node ids survive Figma copies/moves, which is the hazard PROVENANCE
  documents, not a convenience.
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
these): border radius, elevation/shadows, and the derived status `*-subtle` tints
(`success`/`warning`/`danger`/`info`). `--color-primary-subtle` is the exception — it is
extracted from a real Figma frame, not derived (see `theme.css`).

## Testing

React Testing Library (`*.test.tsx`) — render, interactions, a11y roles (ADR-0011).

## Working here (seeds + mulch)

Work in this package is tracked by a `ui`-labelled seed — `sd ready` / `sd search ui` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`ui`** mulch domain: `ml record ui --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
