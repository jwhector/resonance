# Parity — `CreatorOnboardingStage` (`creator_name`) ⇄ `1473:81553`

## Verdict

> **`app.png` matches `design.png` except:** [shared deltas S1–S6 (full-bleed surface / x=120,
>
> > no collapse chevron, Weave mark stand-in, AppNav inventory, Segoe UI, `next dev` badge) · no
> > bottom composer on this stage · 16px between the action buttons where this frame draws 14–15].

Deltas: **6 fixed · 7 accepted · 1 open.** Shared deltas S1–S7 and the capture method are defined
once in [`../14-creator-opening/parity.md`](../14-creator-opening/parity.md); the fixes in S7
apply here too.

## Measurements (after fixes)

| Element                            | design (ink)                             | app (ink)                                | Δ                   |
| ---------------------------------- | ---------------------------------------- | ---------------------------------------- | ------------------- |
| prompt lines                       | y 109 / 133                              | y 109 / 133                              | exact (fixed)       |
| name field                         | x 122–621, y 175–230 (500×56), `#cdcdcd` | x 120–619, y 175–230 (500×56), `#cdcdcd` | x −2 (S1) (fixed y) |
| placeholder colour                 | `#a6a6a6`                                | `#a6a6a6`                                | exact (fixed)       |
| actions row                        | y 253–308                                | y 253–308                                | exact (fixed)       |
| "Good to go" fill                  | `#6034ff`                                | `#6034ff`                                | exact               |
| "I’d like help" border             | 2px `#6034ff`                            | 2px `#6034ff`                            | exact               |
| "Good to go" → "I’d like help" gap | 14px                                     | 16px                                     | delta 3             |

## Screen-specific deltas

1. **Placeholder colour. Fixed.** `TextInput`'s placeholder is `text-subtle` (`#868686`); the frame
   is `#a6a6a6`. The stage now passes `placeholder:text-muted`.
2. **Gap above the actions row. Fixed** (22px, as on screen 14): buttons moved from y=260 to 253.
3. **Horizontal action gap 16px vs 14–15px. Accepted, PROVISIONAL:** the frames disagree with each
   other — this one draws 14 (Good to go → I’d like help) and 15 (→ Skip), expression style
   (`1556:79716`) draws 22 — so no single value is given; `gap-4` stays.
4. **No bottom composer.** The frame draws an empty "Talk to Weave" beneath the inline field.
   **Accepted:** the name is typed into the inline field; a second, sendable field would be
   ambiguous, and its `+`/mic are absent under ADR-0022 §10.
