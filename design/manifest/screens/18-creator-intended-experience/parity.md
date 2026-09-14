# Parity — `CreatorOnboardingStage` (`intended_experience`) ⇄ `1473:81568`

## Verdict

> **`app.png` matches `design.png` except:** [shared deltas S1–S6 · composer width and absent
>
> > `+`/mic as on screen 16 · a disabled "Yes I’m ready" under the prompt where the frame draws no
> > action · no Skip].

Deltas: **9 fixed · 8 accepted · 1 open.** Shared deltas S1–S7 and the capture method:
[`../14-creator-opening/parity.md`](../14-creator-opening/parity.md). Composer fixes (5) and
composer deltas: [`../16-creator-offering/parity.md`](../16-creator-offering/parity.md).

## Measurements (after fixes)

| Element      | design (ink)       | app (ink)          | Δ               |
| ------------ | ------------------ | ------------------ | --------------- |
| prompt lines | y 109 / 133, x=122 | y 109 / 133, x=120 | y exact; x S1   |
| composer     | y 846–941          | y 846–941          | exact; width S1 |

## Screen-specific deltas

1. **A disabled "Yes I’m ready" under the prompt; the frame draws no action.** **Accepted:**
   named by [`design.md`](design.md)'s state contract; enabled once an answer is typed.
2. **No Skip.** Listed by the contract, but this answer gates generation (ADR-0022 §9).
   **Accepted:** tracked by `resonance-4281`.
3. **Composer width / `+` and mic** — as screen 16 deltas 6 (open, part of S1) and 7 (accepted).
