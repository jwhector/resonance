# Parity — `CreatorOnboardingStage` (`offering`) + `WeaveComposer` ⇄ `1473:81556`

## Verdict

> **`app.png` matches `design.png` except:** [shared deltas S1–S6 · the composer runs to x=1471
>
> > (S1) · the composer's `+` and microphone are absent · a disabled "Yes I’m ready" is drawn under
> > the prompt where the frame draws no action · no Skip].

Deltas: **9 fixed · 8 accepted · 1 open.** Shared deltas S1–S7 and the capture method are defined
in [`../14-creator-opening/parity.md`](../14-creator-opening/parity.md). The composer fixes below
apply to every long-form stage (16–20, 22) and to `WeaveInterviewRail`, which shares the component.

## Measurements (after fixes)

| Element         | design                                     | app                                | Δ                       |
| --------------- | ------------------------------------------ | ---------------------------------- | ----------------------- |
| prompt lines    | ink y 109 / 133 / 157                      | ink y 109 / 133 / 157              | exact (fixed)           |
| composer box    | x 121–1391, y 846–941 (h96)                | x 120–1471, y 846–941 (h96)        | height exact; width S1  |
| composer border | 1px `#cdcdcd`, radius 8 (curve ends y≈853) | 1px `#cdcdcd`, radius 8 (y≈854)    | exact (fixed)           |
| composer fill   | `#f2f2f2`                                  | `#f2f2f2`                          | exact                   |
| placeholder     | ink (137, 868), `#a6a6a6`                  | ink (137, 867), `#a6a6a6`          | y −1 (fixed)            |
| send disc       | 20×20 `#a6a6a6`, y 904–923, x 1353         | 20×20 `#a6a6a6`, y 903–922, x 1435 | y −1; x from S1 (fixed) |

## Screen-specific deltas

1. **Composer border. Fixed.** Had none; now `border border-border` (`#cdcdcd`).
2. **Composer radius. Fixed.** `rounded-lg` (16px) → `rounded-md` (8px, the control radius).
3. **Composer height. Fixed.** 104px → 96px: `py-3` + a `py-2`/`min-h-9` field + a 36px actions row
   became `pt-3.5 pb-4.5`, a `py-0`/`min-h-6` (24px line) field, `gap-4.5` and a 20px actions row
   (`h-5`). PROVISIONAL: inner offsets are measured from the screenshot.
4. **Placeholder colour. Fixed.** `#868686` → `#a6a6a6` (`placeholder:text-muted`); field `px-1` →
   `px-0` so the text starts 16px inside the border, as drawn.
5. **Send control. Fixed.** A 36px `#cdcdcd` disc → the frame's 20px disc, `#a6a6a6` when idle
   (`bg-muted`, arrow `text-surface-muted`). The button keeps a 36px hit target via `-m-2`
   around the visual disc, so the change is visual only.
6. **Composer width** runs to x=1471, not 1391. **Open** — part of S1 (surface width).
7. **`+` and microphone absent** (frame x≈140 and x≈1330). **Accepted:** ADR-0022 §10.
8. **A disabled "Yes I’m ready" button under the prompt; the frame draws no action.** **Accepted:**
   [`design.md`](design.md)'s state contract names the stage's actions, which the frame omits;
   the button stays disabled until an answer is typed.
9. **No Skip.** The contract lists Skip, but offering gates generation (ADR-0022 §9), so the
   renderer offers none. **Accepted:** the design-vs-rule decision is tracked by
   `resonance-4281`.
