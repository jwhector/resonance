# Node inventory — Member/Onboarding/CreateAccount/Selection (Slice B)

Every node id cited by `TopicPicker`, `tagVariants`, the `Button` `neutral` variant, and
[`../screens/13-select-topics/design.md`](../screens/13-select-topics/design.md) appears
here. Rule **R1** ([../README.md](../README.md)): a citation with no entry in a `metadata/`
dump is a fabricated citation.

```
fileKey:    vC0O5uyMmw1o5vYHmCoOXq        # "Resonance (Copy)"
page:       MVP
readVia:    Desktop Bridge plugin — figma_execute + figma.getNodeByIdAsync
readAt:     2026-07-29T07:00:49Z … 07:04:23Z
seed:       resonance-9e66
```

Each id below was resolved **in-session** on that date; `name`, `type` and geometry are what
the plugin returned, not what a docstring claimed.

## Frame + its subtree

| nodeId       | name                                                       | type     | w×h      |
| ------------ | ---------------------------------------------------------- | -------- | -------- |
| `1554:79520` | Member/Onboarding/CreateAccount/Selection                  | FRAME    | 1512×982 |
| `1554:79521` | Text (header block)                                        | FRAME    | 335×110  |
| `1554:79522` | Logo/Resonance                                             | GROUP    | 80×24    |
| `1554:79525` | Frame 1000002707 (heading + subtitle)                      | FRAME    | 403×62   |
| `1554:79526` | "Select 3 topics"                                          | TEXT     | 151×30   |
| `1554:79527` | "We will suggest creators and offerings resonate with you" | TEXT     | 403×24   |
| `1554:79528` | Frame 1000002712 (content block)                           | FRAME    | 500×262  |
| `1554:79529` | Frame 1000002711 (chip panel)                              | FRAME    | 500×190  |
| `1554:79530` | Frame 1000002710 (chip rows)                               | FRAME    | 406×142  |
| `1554:79531` | Frame 1000002708 (row 1)                                   | FRAME    | 406×42   |
| `1554:79538` | Frame 1000002709 (row 2)                                   | FRAME    | 406×42   |
| `1554:79544` | Frame 1000002710 (row 3)                                   | FRAME    | 406×42   |
| `1554:79548` | Button/Wide                                                | INSTANCE | 500×56   |

## Chip instances (all `Tags`, `Property 1=Selectable`)

| nodeId       | label        | w×h   | row |
| ------------ | ------------ | ----- | --- |
| `1554:79532` | Wellness     | 74×42 | 1   |
| `1554:79533` | Herbalism    | 81×42 | 1   |
| `1554:79534` | Art          | 41×42 | 1   |
| `1554:79535` | Music        | 58×42 | 1   |
| `1554:79536` | Meditation   | 84×42 | 1   |
| `1554:79537` | **Art**      | 41×42 | 1   |
| `1554:79539` | Spirituality | 83×42 | 2   |
| `1554:79540` | Design       | 63×42 | 2   |
| `1554:79541` | Nature       | 61×42 | 2   |
| `1554:79542` | Community    | 88×42 | 2   |
| `1554:79543` | Writing      | 64×42 | 2   |
| `1554:79545` | Workshops    | 87×42 | 3   |
| `1554:79546` | Philosophy   | 86×42 | 3   |
| `1554:79547` | Tea Culture  | 87×42 | 3   |

`1554:79537` is the **duplicate** "Art". Row 1's six chips span 419px inside a 406px row
frame, so the duplicate also overflows. Ratified: build 13 unique topics.

## Component sets these instances come from

| nodeId       | name        | type          | Variants                                                                                                                                                        |
| ------------ | ----------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `1409:46348` | Tags        | COMPONENT_SET | `Add` `1409:46349` · `Added` `1409:46352` · `AddTag` `1409:46361` · `Plain/White` `1410:43305` · `Selectable` `1518:78061` · `Selectable/Selected` `1519:78238` |
| `1403:56523` | Button/Wide | COMPONENT_SET | `Primary` `1400:57997` · `Black` `1403:56524` · `Outline` `1403:56526` · `Inactive` `1526:78535` · `Gray` `1526:78593`                                          |

Resolved values per variant are tabulated in
[`../screens/13-select-topics/design.md`](../screens/13-select-topics/design.md).

## Cross-frame reference resolved for comparison

| nodeId       | name                             | type  | Note                                                        |
| ------------ | -------------------------------- | ----- | ----------------------------------------------------------- |
| `1526:78839` | Onboarding/Creator/CreateAccount | FRAME | Its 500px column sits at frame-relative **x=506** (centred) |

This is the evidence for the enumerated column-offset delta: the sibling onboarding frame
centres the same 500px column, so `1554:79520`'s x=530 is a per-frame asymmetry.

## Instance-internal ids

Chip label text nodes resolve only as `I<instance>;1518:78062` (e.g.
`I1554:79532;1518:78062`). Per [../README.md](../README.md), `getNodeByIdAsync` hangs on
instance-internal ids — these were read by walking `instance.children`, not by id, and are
**not** cited in code.
