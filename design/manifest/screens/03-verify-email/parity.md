# Verify email (OTP) — parity (screen 03)

**Verdict:** `app.png` **matches `design.png`** (Figma `1526:79050`), except the deltas below.
Reconciled under `resonance-c7c9` (plan `pl-2f9a` step 3).

## Resolved (was drift → now matches)

| Aspect             | Was (app)                          | Now                                              | Verified             |
| ------------------ | ---------------------------------- | ------------------------------------------------ | -------------------- |
| Chrome             | white card + border on gray page   | cardless centered column on white                | ✅ visual            |
| Interpolated email | bold + `#2b2b2b` emphasis          | inline, muted `#a6a6a6` (design has no emphasis) | ✅ visual            |
| OTP cells          | 48×48 (`size-12`)                  | 36×40 (`h-10 w-9`), Figma `InputList`            | ✅ visual            |
| Continue button    | faded-indigo (opacity-50 disabled) | gray disabled — fill `#f2f2f2`, text `#a6a6a6`   | ✅ px text `#a6a6a6` |
| "Try again"        | —                                  | `text-primary` `#6034ff` link                    | ✅ token             |

## Accepted / deferred deltas

1. **Mail icon / OTP box radius / gaps** are within tolerance of the `36×40`, `gap-8`, `radius-8`
   Figma spec (`design.md`); no per-pixel discrepancy observed.
2. Email address is real (interpolated from the pending sign-up), replacing the `jimchoi@gmail.com`
   placeholder in the frame — expected.
