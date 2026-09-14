# Parity — `CreatorOnboardingStage` (`opening`) ⇄ `1473:81547`

## Verdict

> **`app.png` matches `design.png` except:** [the Weave surface is full-bleed rather than the
>
> > frame's shadowed card over a grey backdrop, so content sits at x=120 not 122 · no header
> > collapse chevron · the token-built Weave mark · the AppNav rail inventory · Segoe UI glyphs
> > in place of Helvetica Neue · the `next dev` badge · no bottom composer on this stage].

Deltas: **6 fixed · 7 accepted · 1 open** (shared deltas S1–S7 below plus screen-specific ones).

## How this was captured

`node apps/web/scripts/capture-creator-onboarding.mjs` against
`E2E_HARNESS=1 BETTER_AUTH_SECRET=e2e-harness-insecure-secret pnpm --dir apps/web dev`
(port 3000, real Neon dev DB, fake model/embedder/mail). The script signs a throwaway account up
through `/signup?intent=share`, verifies by the harness OTP seam, skips `/interests`, then drives
every stage via `section[data-stage]`, screenshotting at a 1512×982 viewport with
`deviceScaleFactor: 1` — identical dimensions to `design.png`, no rescaling — and deletes the
account (plus its embeddings) at the end. Captured on **Windows 11**, where Helvetica Neue is not
installed, so the theme's font stack falls back to Segoe UI (S5). Mouse parked and focus blurred
before each shot. Measurements are ink-row runs (min channel < 235–250) and 1×1 `sharp` samples
on both PNGs; a second capture was taken after the fixes and is the committed `app.png`.

## Measurements (after fixes)

| Element                     | design (ink)                      | app (ink)                  | Δ                 |
| --------------------------- | --------------------------------- | -------------------------- | ----------------- |
| header divider              | y=62, `#cdcdcd`                   | y=62, `#cdcdcd`            | exact (fixed)     |
| Weave mark                  | 24×24 at (122, 19)                | 24×24 at (120, 19)         | x −2 (S1) (fixed) |
| "Weave" wordmark            | x=158, y 23–38                    | x=156, y 23–38             | x −2 (S1)         |
| prompt lines 1–5            | y 109/133/157/181/205             | y 109/133/157/181/205      | exact (fixed)     |
| prompt text colour          | `#2b2b2b`                         | `#2b2b2b`                  | exact             |
| "Yes let’s begin" box       | y 245–300 (h56), border `#cdcdcd` | y 245–300 (h56), `#cdcdcd` | exact (fixed)     |
| "I want to do it later" ink | y 313, `#6034ff`                  | y 313, `#6034ff`           | exact (fixed)     |

## Shared deltas (every interview screen, 14–23)

- **S1 — Weave surface chrome. Open.** The frame draws the Weave surface as a card from x≈80 to
  1431 with a 2px shadow on its left (`#fafafa`/`#f7f7f7` at x=80–81) and rounded right corners,
  over a `#8a8a8a`→`#999999` backdrop from x=1432. The app draws a full-bleed white surface to
  x=1512. Consequences: content starts at x=120 rather than 122, and anything full-width (the
  composer, the About field) runs to x=1471 rather than 1391. The surface width and backdrop are
  decided by the `(app)` layout and `onboarding/creator/page.tsx`, not by the stage renderer, so
  this needs a shell decision (what the backdrop is, and whether the card is fixed-width).
- **S2 — No header collapse chevron (`<` at x≈1380). Accepted:** collapsing the Weave surface is
  not a capability; the renderer documents the omission under the same rule as ADR-0022 §10
  (unavailable controls are absent, never dead). Not itemised in the ADR itself.
- **S3 — Weave mark is the token-built stand-in** (filled gradient ring, not the outlined
  spectrum ring). Same 24×24 box after the fix. **Accepted:** asset import tracked by
  `resonance-cbbb`.
- **S4 — AppNav rail inventory and icons differ** (wave glyph, fewer icons, flat avatar discs).
  **Accepted:** carried, `resonance-8619` / `resonance-cbbb`; not part of this renderer.
- **S5 — Segoe UI instead of Helvetica Neue.** `--font-sans` still names Helvetica Neue first;
  the capture machine lacks it. Text runs are 1–2% narrower and glyph shapes differ; vertical ink
  positions agree to the pixel. **Accepted:** capture environment, not code.
- **S6 — `next dev` "N" badge** at (38, 944). **Accepted:** dev-server overlay.
- **S7 — Fixed in `@resonance/ui`:** header divider `border-gray-750` (`#e6e6e6`) →
  `border-border` (`#cdcdcd`); header height `h-16` (64) → `h-15.75` (63); content top padding
  `pt-11` (44) → `pt-10` (40), moving the first prompt ink from y=114 to the frame's y=109;
  `WeaveMark` `size-7` (28) → `size-6` (24).

## Screen-specific deltas

1. **Stacked actions gap. Fixed.** `ActionsRow` stacked arrangement `gap-3` (12) → `gap-1.5` (6):
   link ink moved from y=326 to the frame's y=313.
2. **Gap above the actions row. Fixed.** The frames leave 22px above the actions row (opening,
   name and expression style all measure 22), not the 24px between other blocks; `-mt-0.5` on the
   non-rail row moved the button from y=252 to 245.
3. **No bottom composer.** The frame draws "Talk to Weave" under the opening prompt; the app
   renders the composer only on long-form stages. **Accepted:** on this stage there is nothing
   for it to send, and with its `+`/mic removed (ADR-0022 §10) it would be a dead field.
4. **"Yes let’s begin" is 154px wide vs 158.** Same padding; glyph advance (S5). **Accepted.**
