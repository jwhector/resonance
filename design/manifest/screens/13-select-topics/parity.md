# Parity — `TopicPicker` ⇄ `Member/Onboarding/CreateAccount/Selection`

## Verdict

> **`app.png` matches `design.png` except:** [content column centred at x=506 rather than the
>
> > frame's x=530 · the frame's duplicate "Art" chip is not rendered · chip rows are a wrap
> > rather than three fixed row frames · chip widths run 0.1–1.0px narrower from glyph advance ·
> > the "Continue" label is `font-semibold` (600) where the frame is Medium (500) · the
> > Resonance mark is the token-only `ResonanceMark` approximation, not the real
> > `Logo/Resonance` vector · the selected-chip state is verified against the `Tags` component
> > set rather than this frame, which does not draw one · unselected chips dim once the
> > selection cap is reached, which the frame does not draw].

Every delta is enumerated below with its evidence and its status.

## How this was captured

The component exists before the route that will host it (`/signup`'s topic step is
`resonance-3a7d`), so `app.png` is an **offline capture of the component in isolation**, not
a route screenshot — the pattern in mulch `mx-7f1e52`:

1. A throwaway vitest spec rendered the real `TopicPicker` with `renderToStaticMarkup`.
2. The **real** `packages/ui/src/styles/theme.css` was compiled with Tailwind's `compile()`
   API against the class names scraped out of that markup, so the page carries the shipped
   tokens rather than a hand-written stylesheet.
3. The markup was written into a 1512×982 white frame — the design frame's own box — and
   screenshotted with `@playwright/test` at `deviceScaleFactor: 1`, so `app.png` and
   `design.png` are the same size and directly comparable with no rescaling.
4. The same page was then **measured**: `getBoundingClientRect()` + `getComputedStyle()` per
   element, compared against the frame numbers in [`design.md`](design.md).
5. The spec and the scripts were deleted; nothing here runs in CI.

`app-selected.png` is the same capture with three topics selected.
`design-tag-variants.png` is the `Tags` component set, which is where the selected treatment
is specified.

**Measurement is the part that pays.** The first pass looked correct by eye while every chip
was 46px tall instead of 42 and the panel was 204 instead of 190 — Figma draws strokes
_inside_ the padding box and CSS adds them outside. Only the numbers caught it.

## Geometry — measured DOM vs frame

All values frame-relative. Design `x` is quoted as drawn; the app column is centred, so its
`x` is 24 lower by the enumerated delta below.

| Element              | design (x, y, w, h) | app (x, y, w, h)   | Δ                      |
| -------------------- | ------------------- | ------------------ | ---------------------- |
| content column       | 530, 293, 500, 396  | 506, 293, 500, 396 | x −24 (enumerated)     |
| `Logo/Resonance`     | 740, 293, 80, 24    | 716, 293, 80, 24   | x −24 · **size exact** |
| heading baseline box | —, 341, —, 30       | —, 341, —, 30      | **exact**              |
| subtitle             | —, 379, —, 24       | —, 379, —, 24      | **exact**              |
| chip panel           | 530, 427, 500, 190  | 506, 427, 500, 190 | x −24 · **size exact** |
| chip row 1           | 554, 451, —, 42     | 530, 451, —, 42    | x −24 · **y+h exact**  |
| chip row 2           | 554, 501, —, 42     | 530, 501, —, 42    | x −24 · **y+h exact**  |
| chip row 3           | 554, 551, —, 42     | 530, 551, —, 42    | x −24 · **y+h exact**  |
| `Button/Wide`        | 530, 633, 500, 56   | 506, 633, 500, 56  | x −24 · **size exact** |

Gaps — mark→heading `24`, heading→subtitle `8`, header→panel `24`, panel→button `16`,
row→row `8`, chip→chip `8`: **all exact.**

## Computed styles vs extracted design values

| Property             | design                  | app (computed)                         | verdict          |
| -------------------- | ----------------------- | -------------------------------------- | ---------------- |
| page background      | `#ffffff`               | `#ffffff`                              | ✅ pixel-sampled |
| heading              | 22/30 Medium `#2b2b2b`  | `22px / 30px / 500 / rgb(43,43,43)`    | ✅               |
| subtitle             | 16/24 Regular `#a6a6a6` | `16px / 24px / 400 / rgb(166,166,166)` | ✅               |
| panel border         | 1px `#cdcdcd`, r16      | `1px / rgb(205,205,205) / 16px`        | ✅ pixel-sampled |
| chip border          | 2px `#cdcdcd`, r8       | `2px / rgb(205,205,205) / 8px`         | ✅               |
| chip type            | 12/18 Medium `#2b2b2b`  | `12px / 18px / 500 / rgb(43,43,43)`    | ✅               |
| chip box             | 42px tall               | `42px`                                 | ✅               |
| selected chip border | `#6034ff`               | `rgb(96,52,255)`                       | ✅               |
| selected chip fill   | `#dfd6ff`               | `rgb(223,214,255)`                     | ✅               |
| selected chip text   | `#6034ff`               | `rgb(96,52,255)`                       | ✅               |
| button fill          | `#2b2b2b`               | `rgb(43,43,43)`                        | ✅ pixel-sampled |
| button label colour  | `#ffffff`               | `rgb(255,255,255)`                     | ✅               |
| button radius / size | 8px, 500×56             | `8px`, 500×56                          | ✅               |
| button label weight  | Medium 500              | `600`                                  | ⚠️ delta 5       |

## Band diffs

`design.png` cropped at x=530, `app.png` at x=506 — i.e. the ratified 24px offset is
**applied**, so the diff measures everything except that offset. Percentages are pixels whose
worst channel differs by more than the tolerance.

| Band                               | y   | h   |    >12 |   >20 |
| ---------------------------------- | --- | --- | -----: | ----: |
| full content column                | 293 | 396 |  4.95% | 4.32% |
| header (mark + heading + subtitle) | 293 | 110 |  4.02% | 2.80% |
| chip panel                         | 427 | 190 |  7.52% | 6.94% |
| chip rows only                     | 451 | 142 | 10.00% | 9.26% |
| Continue button                    | 633 | 56  |  1.61% | 1.49% |

Isolating the causes inside the chip band:

| Region                                         |    >20 | reads as                                    |
| ---------------------------------------------- | -----: | ------------------------------------------- |
| duplicate-Art region (design draws a 6th chip) | 13.30% | delta 2 — nothing is drawn there in the app |
| row 1 minus that chip                          | 13.20% | cumulative glyph-advance drift (delta 4)    |
| row 1, first chip only (no accumulated drift)  |  6.20% | border + glyph antialiasing floor           |
| row 2, first chip only                         |  7.34% | same floor                                  |
| Continue label only                            | 10.63% | delta 5 — the label is a weight heavier     |

The "first chip only" figures are the floor: a 78×48 crop is ~15% border pixels, so
sub-pixel antialiasing on a 2px stroke plus 12px glyphs cannot go to zero. The button band at
**1.49%** — a large flat fill with one text run — is the cleanest signal that placement,
size, radius and fill are right.

Point samples (`sharp`, 1×1 regions) agree exactly on page background, button fill, panel
border and chip interior; see the table above.

## Enumerated deltas

1. **Content column centred at x=506, not the frame's x=530.** The frame puts its 500px
   column 24px right of centre. Its sibling in the same flow,
   `Onboarding/Creator/CreateAccount` (`1526:78839`), puts the identical 500px column at
   exactly x=506 — resolved live and recorded in
   [`../../metadata/member-onboarding-selection.md`](../../metadata/member-onboarding-selection.md).
   The asymmetry is in this one frame, not in the spec, and every built onboarding screen
   centres. **Status: ratified, will not change.**
2. **The frame's duplicate "Art" chip is not rendered.** `1554:79534` and `1554:79537` are
   both "Art", and the resulting six chips overflow their own 406px row frame. The component
   renders **13 unique** topics. **Status: ratified with the user before the build.**
3. **Chips wrap; the design hard-codes three 406px row frames.** The topic list is a prop, so
   a fixed row assignment is not expressible. Measured outcome at the panel's 452px content
   box: `[Wellness, Herbalism, Art, Music, Meditation]` / `[Spirituality, Design, Nature,
Community, Writing]` / `[Workshops, Philosophy, Tea Culture]` — **the design's rows,
   member for member**, at the design's y offsets. **Status: construction difference with no
   visual consequence at the designed width.**
4. **Chip widths run 0.1–1.0px narrower than the frame.** Per chip: Wellness 73.6 vs 74,
   Herbalism 80 vs 81, Art 40.2 vs 41, Music 57.4 vs 58, Meditation 83.1 vs 84, Spirituality
   82.7 vs 83, Design 62.5 vs 63, Nature 60.9 vs 61, Community 87.6 vs 88, Writing 63.1 vs
   64, Workshops 86.7 vs 87, Philosophy 85.6 vs 86, Tea Culture 86.5 vs 87. Padding, border
   and type are identical, so this is glyph-advance rounding between Figma's text layout and
   the browser's; it accumulates to ≤3.7px across a five-chip row. **Status: not actionable.**
5. **"Continue" renders at `font-semibold` (600); the frame is Helvetica Neue Medium (500).**
   The weight comes from the shared `Button` base class, so it is repo-wide and pre-existing —
   every onboarding submit already ships at 600. Changing it is a design-system edit touching
   screens whose parity artifacts were captured against the current weight, so it is **not**
   changed here. **Status: filed as `resonance-e16b`.**
6. **The Resonance mark is `ResonanceMark`, a token-only approximation.** Same 80×24 box and
   same spectrum stroke, fewer loops than the real `Logo/Resonance` vector. Pre-existing and
   already tracked as `resonance-cbbb`. **Status: carried, not new to this screen.**
7. **The selected-chip state is verified against the component set, not this frame.** The
   frame draws every chip unselected, so the selected treatment comes from `Tags`
   `Selectable/Selected` (`1519:78238`) — captured as `design-tag-variants.png` and matched
   exactly (`#6034ff` border, `#dfd6ff` fill, `#6034ff` text) in `app-selected.png`.
   **Status: verified against the authoritative artifact.**
8. **Unselected chips dim to 50% once the selection cap is reached.** Not drawn anywhere in
   the design. Added because `MemberInterestsSchema` caps a selection at
   `MEMBER_INTEREST_MAX` (10) and a picker that can build a rejected payload is a defect.
   Only reachable with ≥11 topics on screen. **Status: deliberate addition, documented here.**

## Not deltas — behaviour ratified before the build

- **"Continue" is never gated on the count.** The heading asks for `MEMBER_INTEREST_TARGET`
  (3) topics, but the step is skippable and `MemberInterestsSchema` takes a minimum of zero,
  so the button submits an empty selection. The frame draws the button **enabled**
  (`Button/Wide` = `Black`, not `Inactive`), which agrees.
- **Chips are checkboxes, not styled divs.** A multi-select needs checkbox semantics; the
  design has nothing to say about the accessibility tree.
