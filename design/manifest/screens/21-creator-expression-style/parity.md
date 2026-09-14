# Parity — `CreatorOnboardingStage` (`expression_style`) ⇄ `1556:79716`

## Verdict

> **`app.png` matches `design.png` except:** [shared deltas S1–S6 · the prompt is a two-line
>
> > paragraph where the frame draws "This helps me shape:" and a four-item bulleted list, which
> > moves the options up 97px · every unselected option label is `#2b2b2b` where the frame greys two
> > of three · 16px between the action buttons where the frame draws 22 · no bottom composer].

Deltas: **5 fixed · 9 accepted · 2 open.** Shared deltas S1–S7 and the capture method:
[`../14-creator-opening/parity.md`](../14-creator-opening/parity.md). Dreamy & Reflective was
selected before the shot, as the frame draws it.

## Measurements (after fixes)

Design `y` for the options and buttons is 97px lower than the app's because of delta 1; the
geometry below is compared relative to the first option.

| Element                        | design                                   | app                                      | Δ             |
| ------------------------------ | ---------------------------------------- | ---------------------------------------- | ------------- |
| option boxes                   | 500×56, pitch 72 (gap 16), 2px `#cdcdcd` | 500×56, pitch 72 (gap 16), 2px `#cdcdcd` | exact         |
| selected option                | 2px `#6034ff`, label `#6034ff`           | 2px `#6034ff`, label `#6034ff`           | exact         |
| last option → actions row      | 22px (544 → 566)                         | 22px (447 → 469)                         | exact (fixed) |
| "Good to go" / "Choose for me" | filled `#6034ff` / 2px `#6034ff` outline | same                                     | exact         |
| button → button gap            | 22px                                     | 16px                                     | delta 3       |

## Screen-specific deltas

1. **Prompt copy is a paragraph, not a list. Open.** The frame reads "This helps me shape:" followed
   by four bullets (profile atmosphere, visual direction, future offerings, overall feeling); the
   `snapshot-v1` copy joins them into one sentence because the render contract's prompt is a list
   of plain-string paragraphs with no list semantics. Reproducing it needs either a contract
   affordance for list items or a copy change in `@resonance/ai` — out of scope for a class fix.
   This one delta moves everything below the prompt up by 97px.
2. **Unselected labels.** The frame draws Calm & Clean and Custom direction in `#a6a6a6` but Bold &
   Expressive in `#2b2b2b`; the app draws all three `#2b2b2b`. **Accepted:** no state distinguishes
   the grey two from the dark one, so the frame is inconsistent rather than specifying a treatment.
3. **Button gap 16px vs 22px. Accepted, PROVISIONAL:** the name frame (`1473:81553`) draws 14px for
   the same row, so the frames give no single value.
4. **Gap above the actions row. Fixed** (22px, as on screen 14).
5. **No bottom composer.** **Accepted:** as screen 15 delta 4 — this stage takes a choice, not text.
6. **"Choose for me" 158px wide vs 161.** Glyph advance (S5). **Accepted.**
