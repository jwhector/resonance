# Parity — `CreatorOnboardingStage` (`completion` rail) ⇄ `Onboarded` `1443:78273`

## Verdict

> **`app.png` matches `design.png` except:** [the rail spans the whole surface where the frame
>
> > draws a 333px Weave sidebar over the published profile, and the profile is summarised as three
> > text lines inside the rail instead · no header chevron or close control · the three unbuilt
> > actions are disabled and badged "Coming soon" · Finish for now is `#a6a6a6` as drawn but reads
> > as disabled · no composer · shared deltas S3–S6 (Weave mark, AppNav, Segoe UI, `next dev` badge)].

Deltas: **4 fixed · 8 accepted · 1 open.** Shared deltas S1–S7 and the capture method:
[`../14-creator-opening/parity.md`](../14-creator-opening/parity.md). Captured immediately after
pressing Good to go on the foundation stage, before Finish for now.

## Measurements (after fixes)

| Element                        | design (ink)                  | app (ink)                      | Δ                    |
| ------------------------------ | ----------------------------- | ------------------------------ | -------------------- |
| rail header divider            | y=75, `#cdcdcd`               | y=75, `#cdcdcd`                | exact (fixed colour) |
| Weave mark                     | 24×24, x=106                  | 24×24, x=104                   | x −2 (fixed size)    |
| first prompt line              | y=106                         | y=106                          | exact (fixed)        |
| paragraph gap                  | 24                            | 24                             | exact                |
| prompt → first button          | 24                            | 24                             | exact                |
| action buttons                 | 253×56, gap 12, 2px `#cdcdcd` | 1352×56, gap 12, 2px `#cdcdcd` | width (delta 1)      |
| last button → "Finish for now" | 30px ink gap (508 → 538)      | 30px (435 → 466)               | exact (fixed)        |
| "Finish for now" colour        | `#a6a6a6`, centred            | `#a6a6a6`, centred             | exact                |

## Deltas

1. **Rail width and the profile beneath it. Open.** The frame composes a 333px Weave sidebar
   (x 80–414) overlaying the live creator profile — indigo `#6034ff` hero with name, headline and
   keyword tags, Share/Publish/Edit Profile actions, the Offerings/Receivings/Following/About tabs.
   The app renders the completion stage across the full surface and shows the committed profile as
   a three-line summary (name, headline, tags) under the actions. Matching it means rendering the
   published profile page behind a fixed-width rail on `/onboarding/creator` (or opening the rail
   over `/creator/[id]`) — web wiring and layout, not a class fix in the renderer. Everything that
   depends on width (button widths 1352 vs 253, the prompt wrapping to one line instead of two) is
   part of this delta.
2. **Rail header top padding. Fixed.** `pt-9` (36) → `pt-6` (24): first ink y=118 → 106.
3. **Finish for now spacing. Fixed.** The rail's text action had the rail's 12px gap; the frame
   leaves 24px. `mt-3` on the rail text action: the ink gap below the last button went from 18px
   (447 → 466, before the padding fix) to 30px (435 → 466), matching the frame.
4. **Header divider colour and mark size. Fixed** — S7 (`#e6e6e6` → `#cdcdcd`; mark 28 → 24).
5. **No `>` expand chevron or `×` close in the rail header.** **Accepted:** neither capability
   exists; absent rather than dead (the ADR-0022 §10 rule; not itemised in the ADR).
6. **Create profile image / Create cover image / Refine profile are disabled (`aria-disabled`,
   60% opacity) and carry a "Coming soon" badge;** the frame draws them as ordinary outlined
   buttons with `#2b2b2b` labels. **Accepted:** ADR-0022 §10.
7. **Finish for now is `#a6a6a6` on white (~2.4:1) and reads as disabled** although it is the only
   working action. Matches the frame. **Accepted:** the design/a11y call is `resonance-76e8`.
8. **No composer** (frame: 253×96 at the rail bottom with `+`/mic). **Accepted:** a completed
   session rejects every transition (ADR-0022 §10), so there is nothing for it to send.
9. **S3–S6** — Weave mark stand-in (`resonance-cbbb`), AppNav inventory (`resonance-8619`),
   Segoe UI glyphs, `next dev` badge. **Accepted** (4).
