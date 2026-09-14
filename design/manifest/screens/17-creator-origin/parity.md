# Parity — `CreatorOnboardingStage` (`origin`) ⇄ `1473:81565`

## Verdict

> **`app.png` matches `design.png` except:** [shared deltas S1–S6 · composer width and absent
>
> > `+`/mic as on screen 16 · "Yes I’m ready" and Skip drawn under the prompt where the frame draws
> > no action].

Deltas: **9 fixed · 7 accepted · 1 open.** Shared deltas S1–S7 and the capture method:
[`../14-creator-opening/parity.md`](../14-creator-opening/parity.md). Composer fixes (5) and
composer deltas: [`../16-creator-offering/parity.md`](../16-creator-offering/parity.md).

## Measurements (after fixes)

| Element         | design (ink)                | app (ink)                   | Δ               |
| --------------- | --------------------------- | --------------------------- | --------------- |
| prompt lines    | y 109 / 133 / 157, x=122    | y 109 / 133 / 157, x=120    | y exact; x S1   |
| question weight | bold line 3                 | bold line 3                 | exact           |
| composer        | y 846–941, `#cdcdcd` border | y 846–941, `#cdcdcd` border | exact; width S1 |

## Screen-specific deltas

1. **"Yes I’m ready" (primary) and Skip (text) drawn under the prompt; the frame draws neither.**
   **Accepted:** [`design.md`](design.md)'s state contract names both actions; the frame omits
   them. Origin is optional (ADR-0022 §9), so Skip is offered.
2. **Composer width / `+` and mic** — as screen 16 deltas 6 (open, part of S1) and 7 (accepted).
