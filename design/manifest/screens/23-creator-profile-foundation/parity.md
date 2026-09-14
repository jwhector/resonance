# Parity — `CreatorOnboardingStage` (`foundation`) + `FoundationEditor` ⇄ `2065:58399`

## Verdict

> **`app.png` matches `design.png` except:** [shared deltas S1–S6 · the second prompt line's copy ·
>
> > harness draft content (different second/third name candidates and shorter rationales) · 24px
> > radio indicators where the frame draws 20px · the About field runs full width (to x=1471) where
> > the frame stops at x=1351 · no bottom composer, so the Search Keywords block is visible in the
> > viewport where the frame hides the draft behind the composer].

Deltas: **4 fixed · 11 accepted · 3 open.** Shared deltas S1–S7 and the capture method:
[`../14-creator-opening/parity.md`](../14-creator-opening/parity.md). The foundation comes from
the harness's fixed fake generator (`FAKE_CREATOR_FOUNDATION_DRAFT`), first candidate selected, as
the frame draws it.

## Measurements (after fixes)

| Element                     | design (ink)               | app (ink)                  | Δ             |
| --------------------------- | -------------------------- | -------------------------- | ------------- |
| prompt lines                | y 109 / 133 / 157          | y 109 / 133 / 157          | exact (fixed) |
| "Creator Name" heading      | y 207, 28px bold `#2b2b2b` | y 208, 28px bold `#2b2b2b` | +1 (S5)       |
| first candidate name        | y 261, x=162               | y 259, x=160               | −2 / S1       |
| first rationale             | y 303, `#2b2b2b`           | y 303, `#2b2b2b`           | exact         |
| unselected name + rationale | `#a6a6a6`                  | `#a6a6a6`                  | exact         |
| selected radio              | 20×20, `#6034ff`           | 24×24, `#6034ff`           | delta 3       |
| Headline heading → field    | 51px ink-to-box            | 52px                       | +1 (S5)       |
| Headline field              | 500×56, `#cdcdcd`          | 500×56, `#cdcdcd`          | exact         |
| field → next heading        | 33px                       | 32px                       | −1 (S5)       |
| About field                 | x 122–1351 (w1230)         | x 120–1471 (w1352)         | delta 4       |

## Screen-specific deltas

1. **Second prompt line reads "Keep what already feels like you, and edit anything that doesn’t."**
   where the frame says "…or explore another direction together." **Accepted:** the frame's line
   invites Revise with Weave, which is absent (ADR-0022 §10); the substitution is documented in
   `snapshot-v1.copy.ts`.
2. **Draft content differs** (Night Bloom Collective / Lumen Herb Lab as candidates 2–3, shorter
   rationales, no "[Creator Name]" prefix in About). **Accepted:** harness fixture data, not layout.
3. **Radio indicator 24px vs 20px. Open.** The size belongs to the shared `Radio` primitive
   (`packages/ui/src/primitives/radio.tsx`), outside the files this pass may change; shrinking it
   there would also move `/start` and the expression-style cards, which need their own re-capture.
4. **About field width. Open.** The frame's field is 1230px wide and stops 80px short of the
   surface edge, while the composer below it runs to 40px. Part of it is S1 (surface width); the
   remaining 40px right inset is not explained by the frame's other elements, so no value is
   applied until the surface decision in S1 is made.
5. **No bottom composer on this stage.** The frame draws the draft scrolling behind "Talk to
   Weave". **Accepted:** the composer here would carry field-by-field refinement with Weave, which
   is deferred (ADR-0022 §10); without it the Search Keywords heading and chips are visible at
   y≈927–982 inside the viewport.
6. **Search Keywords block, Add tag and the actions row are below the frame's viewport** and have no
   drawn reference. **Accepted, PROVISIONAL** (already labelled so in `creator-onboarding-foundation.tsx`).
7. **Candidate name → rationale spacing redistributes ≈2px** (frame 42px name-to-rationale ink,
   app 44; the name-to-name pitch is identical at 110px). **Accepted:** below the font-substitution
   noise floor of this capture (S5); re-measure on a machine with Helvetica Neue.
8. **About textarea shows a resize grip** at its bottom-right. The frame hides that corner behind
   the composer, so it cannot be compared. **Accepted, unverifiable.**
