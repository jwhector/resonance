# Member/Onboarding/CreateAccount/Selection — design spec

The member's **interest selection** step (Slice B, `pl-496f`). This is the screen
`@resonance/ui`'s `TopicPicker` is built against; `apps/web` mounts it in a later step
(`resonance-3a7d`).

## Provenance

```
fileKey:         vC0O5uyMmw1o5vYHmCoOXq        # "Resonance (Copy)", page MVP
nodeId:          1554:79520                    # Member/Onboarding/CreateAccount/Selection
capturedAt:      2026-07-29T07:04:23Z
capturedVia:     Desktop Bridge plugin — figma_execute + node.exportAsync({PNG, SCALE 1})
designPngSha256: 36a4484e5ccecd629a08a3e93f0969c30d4f033fe7c82ddb32a688a2bc4b72d3
figmaVersionId:  UNAVAILABLE
provenance:      copy-derived
```

**Figma version ids are not obtainable** — `FIGMA_ACCESS_TOKEN` returns `403`, so every REST
tool including `get_file_versions` is dead. **The SHA-256 of `design.png` is the substitute
drift detector.** Hash matches → frame unchanged in this copy. Hash differs → re-audit
before trusting anything below. See [../../PROVENANCE.md](../../PROVENANCE.md).

Node inventory (R1): [../../metadata/member-onboarding-selection.md](../../metadata/member-onboarding-selection.md).

- **Frame:** 1512×982, bg `#ffffff`. No nav rail, no Weave column — the frame has exactly
  two children, the header block and the content block.
- **Second artifact:** `design-tag-variants.png` is the `Tags` component set (`1409:46348`)
  exported at SCALE 2. The frame draws only the **unselected** chip, so the selected
  treatment is specified by the component set, not by this frame.

## Layout

One centred column. Everything is vertically centred in the 982px frame: the content block
is 396px tall and starts at y=293.

| Element                                        | node         |   x |   y |   w |   h |
| ---------------------------------------------- | ------------ | --: | --: | --: | --: |
| `Text` (header block, VERTICAL, gap 24)        | `1554:79521` | 530 | 293 | 500 | 110 |
| ├ `Logo/Resonance`                             | `1554:79522` | 740 | 293 |  80 |  24 |
| └ heading block (VERTICAL, gap 8)              | `1554:79525` | 530 | 341 | 500 |  62 |
| `Frame 1000002712` (content, VERTICAL, gap 16) | `1554:79528` | 530 | 427 | 500 | 262 |
| ├ chip panel                                   | `1554:79529` | 530 | 427 | 500 | 190 |
| │ └ chip rows (VERTICAL, gap 8)                | `1554:79530` | 554 | 451 | 406 | 142 |
| └ `Button/Wide`                                | `1554:79548` | 530 | 633 | 500 |  56 |

`x` is **frame-relative**. Gaps, top to bottom: mark → heading `24`, heading → subtitle `8`,
header → content `24`, panel → button `16`, chip row → chip row `8`, chip → chip `8`.

**Content column x — read this before building.** The frame places the 500px column at
**x=530**, which is 24px right of centre ((1512−500)/2 = 506). Its sibling in the same flow,
`Onboarding/Creator/CreateAccount` (`1526:78839`), places the identical 500px column at
exactly **x=506**. The +24 is an asymmetry in this one frame, not a spec; the built component
centres. Recorded as an enumerated delta in [`parity.md`](parity.md).

## Type

| Role     | Text                                                       | Font                   | Size / line | Fill                     |
| -------- | ---------------------------------------------------------- | ---------------------- | ----------- | ------------------------ |
| Heading  | "Select 3 topics"                                          | Helvetica Neue Medium  | 22 / 30     | `#2b2b2b` (`foreground`) |
| Subtitle | "We will suggest creators and offerings resonate with you" | Helvetica Neue Regular | 16 / 24     | `#a6a6a6` (`muted`)      |
| Chip     | topic label                                                | Helvetica Neue Medium  | 12 / 18     | `#2b2b2b` (`foreground`) |
| Button   | "Continue"                                                 | Helvetica Neue Medium  | 16 / 24     | `#ffffff`                |

The heading's "3" is the design's target count — `MEMBER_INTEREST_TARGET` in
`@resonance/core`. It is **copy, not a validation rule**: this step is skippable.

## Chip panel — `1554:79529`

Transparent fill, **1px** `#cdcdcd` (`border`) stroke, **16px** radius, **24px** padding.
Figma draws the stroke _inside_ the padding box, so the drawn panel is 500×190; in CSS the
border adds outside it and the padding carries 23px.

## Chips — `Tags` component set `1409:46348`

Every chip is an instance of `Property 1=Selectable` (`1518:78061`). Geometry, shared by
every variant: **2px** stroke, **8px** radius, **12px** padding, **4px** gap, 42px tall.
(Same inside-stroke rule as the panel: in CSS the padding carries 10px and the border 2.)

| Variant               | node         | Stroke    | Fill      | Text      | Maps to `tagVariants`   |
| --------------------- | ------------ | --------- | --------- | --------- | ----------------------- |
| `Selectable`          | `1518:78061` | `#cdcdcd` | none      | `#2b2b2b` | `selectable`            |
| `Selectable/Selected` | `1519:78238` | `#6034ff` | `#dfd6ff` | `#6034ff` | `selected`              |
| `Added`               | `1409:46352` | `#2b2b2b` | none      | `#2b2b2b` | `outline` (the default) |
| `Add`                 | `1409:46349` | `#a6a6a6` | none      | `#a6a6a6` | not built               |
| `AddTag`              | `1409:46361` | `#6034ff` | none      | `#6034ff` | not built               |
| `Plain/White`         | `1410:43305` | `#ffffff` | none      | `#ffffff` | not built               |

`#dfd6ff` is **new to the token set** — it sits between the derived `primary-100` (`#e4dcff`)
and `primary-200` (`#cbbcff`), so it ships as its own role token `--color-primary-subtle`
rather than being rounded onto the ramp (same treatment as `--color-image-placeholder`).

### The frame draws 14 chips but only 13 topics

Row 1 renders **"Art" twice** — `1554:79534` and `1554:79537` are both `Art`. The duplicate
also overflows its own row frame (the six chips span 419px inside a 406px row). Ratified with
the user: render **13 unique** topics — Wellness, Herbalism, Art, Music, Meditation,
Spirituality, Design, Nature, Community, Writing, Workshops, Philosophy, Tea Culture.

### Row structure is a wrap, not three fixed rows

The design hard-codes three 406px row frames. The built component wraps instead, because the
topic list is a prop. At the panel's 452px content box the wrap reproduces the design's rows
**exactly** — `[Wellness, Herbalism, Art, Music, Meditation]` / `[Spirituality, Design,
Nature, Community, Writing]` / `[Workshops, Philosophy, Tea Culture]` — measured in
[`parity.md`](parity.md).

## Button — `Button/Wide` component set `1403:56523`

This frame instantiates `Property 1=Black` (`1403:56524`): **`#2b2b2b`** fill, `#ffffff`
label, 8px radius, 500×56. It is **not** the brand-indigo `Primary` variant. The set's five
variants:

| Variant    | node         | Fill      | Label     |
| ---------- | ------------ | --------- | --------- |
| `Primary`  | `1400:57997` | `#6034ff` | `#ffffff` |
| `Black`    | `1403:56524` | `#2b2b2b` | `#ffffff` |
| `Outline`  | `1403:56526` | `#ffffff` | `#2b2b2b` |
| `Inactive` | `1526:78535` | `#f2f2f2` | `#a6a6a6` |
| `Gray`     | `1526:78593` | `#f2f2f2` | `#2b2b2b` |

The button is drawn **enabled**, which matches the ratified behaviour: this step is
skippable, so "Continue" is never gated on a selection count.
