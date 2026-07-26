# Member/Search/Result/Creators — design spec

**The primary frame for Slice A** (`pl-bbca`, member discovery core). This is the screen
`/discover` is built against.

## Provenance

```
fileKey:         vC0O5uyMmw1o5vYHmCoOXq        # "Resonance (Copy)", page MVP
nodeId:          1443:78153                    # Member/Search/Result/Creators
capturedAt:      2026-07-26T23:41:08Z
capturedVia:     Desktop Bridge plugin — figma_execute + node.exportAsync({PNG, SCALE 1})
designPngSha256: f5c8377d439ccd90a904ee59aaae3b161f78dc0e8bbe7f8d17ee0de7677ba5f8
figmaVersionId:  UNAVAILABLE
provenance:      copy-derived
```

**Figma version ids are not obtainable** — `FIGMA_ACCESS_TOKEN` returns `403`, so every
REST tool including `get_file_versions` is dead. **The SHA-256 of `design.png` is the
substitute drift detector.** `exportAsync` at a fixed scale is byte-reproducible, so
re-capturing an unchanged frame reproduces the identical hash (verified in-session for this
node). Hash matches → frame unchanged in this copy. Hash differs → re-audit before trusting
anything below.

This is a **copy** of the designer's file. Node ids resolve forever but drift in meaning as
the original is edited — see [../../PROVENANCE.md](../../PROVENANCE.md) and `resonance-6db8`.
Node inventory: [../../metadata/member-search-frames.md](../../metadata/member-search-frames.md).

- **Frame:** 1512×982, bg `#ffffff`
- **Code status:** `orphan-design` at capture time — `/discover` does not exist yet.
  **No parity claim is made or implied by this file.** Parity is a diff of two images
  (ADR-0019 R2) and there is no `app.png`; step 6 of `pl-bbca` (`resonance-3f15`) produces it.

## Layout

Three columns, left to right:

| Region                  | x   | w   | Notes                                                    |
| ----------------------- | --- | --- | -------------------------------------------------------- |
| `Sidebar/Customer/MVP`  | 1   | 80  | white, 1px `#cdcdcd` hairline on its right edge at x=80  |
| `Weave/Sidebar`         | 81  | 40  | white; Weave symbol + dropdown arrow, 24×24 each, gap 24 |
| `Main` → content column | 514 | 604 | the search/tabs/results stack                            |

**Content column x — read this before building.** This frame puts `Main` at **x=133** and
the column at **x=527**. Its three sibling frames (Products/Services/Posts) put `Main` at
x=120 and the column at **x=514**. x=514 is the centred value: content area is 121→1512
(1391 wide), and `121 + (1391 − 604) / 2 = 514.5`. **The 13px offset on this frame is design
scaffolding slop — build the centred 514, matching the siblings.** Enumerate it as a known
deviation-from-this-frame rather than reproducing it.

Column stack (`Frame 1000002705`, VERTICAL, **gap 40**), starting at y=40:

```
y=40    SearchBar/Filled   604×56
y=136   Tabs/Search        604×49
y=225   result list        604×n     VERTICAL, gap 24
```

Left nav rail (`Frame 49`, x=14 y=24, VERTICAL gap 24): Resonance wave mark 53×16 → `Icon/Home`
24×24 → `ProfileImg/Circle/40px` 40×40.

## SearchBar/Filled — `1443:78158`

- 604×56, bg `#ffffff`, border **1px `#cdcdcd`**, radius **8**, padding **16** all sides
- Content row: HORIZONTAL, gap **8**, align center
  - `Icon/Search` 24×24, leading
  - query text — **Helvetica Neue Regular 16 / lh 24**, `#2b2b2b` (`--gray-300`); sample `"Tinctures"`
  - trailing **clear (×) affordance**, 16×16, right-aligned
- The clear control is present in the design, so `SearchBar` ships with it (step 4,
  `resonance-7a42`). Empty-state placeholder copy is **not** shown on this frame — the
  sibling `Member/Search/Home` right-rail bar reads **"Search on Resonance"**, which is the
  only placeholder string the design gives. `PROVISIONAL` for this screen.

## Tabs/Search — `1443:78159`

604×49, HORIZONTAL, gap 0 — **four fixed 151px tabs**, in order:

`Products` · `Services` · `Posts` · **`Creators`** (active on this frame)

Each `Tab/Fixed/RegularT` is 151×49, VERTICAL, gap **17**, centre-aligned:

| Part           | Size  | Idle      | Active    |
| -------------- | ----- | --------- | --------- |
| label          | —     | `#a6a6a6` | `#2b2b2b` |
| underline rect | 151×2 | `#a6a6a6` | `#2b2b2b` |

- Label type — **Helvetica Neue Medium 22 / lh 30** (Heading/M) for both states. Only the
  colour changes; there is no weight or size change on selection.
- The underline is drawn under **every** tab, not just the active one — the idle
  `#a6a6a6` bars form the continuous rule and the active tab darkens its segment.
  `#a6a6a6` = `--gray-600`, `#2b2b2b` = `--gray-300`.

## Result row — `List/Profile&Button/Small`

604×48, HORIZONTAL, align center, **space-between** (leading cluster vs trailing button).
Rows are stacked with **gap 24**.

Leading cluster (`Frame 1000002180`, HORIZONTAL, gap **16**, align center):

- **Avatar** — `ProfileImg/Square/48`: 48×48, radius **8**. A `#d9d9d9` plate with an IMAGE
  fill on top. See the parity delta below.
- Text block (VERTICAL, gap 0, align left):
  - **display name** — Helvetica Neue Medium **16 / lh 24**, `#000000` (literal black, not a
    `--gray-*` token — same literal-hex issue `_index.md` flags cross-cutting)
  - beside it, gap **16**: **`Symbol/Weave/24px`** 24×24 — the gradient Weave badge
  - **`By <person>`** — Helvetica Neue Regular 16 / lh 24, `#a6a6a6` (`--gray-600`)

Trailing button — `Button/Small`, height 48, radius **8**, padding **12 / 16**, gap 10,
label Helvetica Neue Medium 16 / lh 24:

| State         | Label       | Width | Fill              | Text      |
| ------------- | ----------- | ----- | ----------------- | --------- |
| not following | `Follow`    | 81    | `#6034ff` (brand) | `#ffffff` |
| following     | `Following` | 104   | `#f2f2f2`         | `#2b2b2b` |

Width is hug-contents — it changes with the label; do not fix it.

**`#6034ff` is the real brand primary.** The app currently ships `--color-primary` as stock
Tailwind purple `#a855f7` (`resonance-4be7`, still open). Do not hand-wave this row's button
to the current token — it will be visibly wrong.

The frame draws **13 rows**, alternating Follow/Following purely as sample data. Two of the
13 are `Following`; there is no ordering rule implied.

## Enumerated parity deltas (ADR-0019)

Deltas known **before** a line of code is written, from data the schema cannot supply.
They belong in `/discover`'s eventual parity statement — "matches `design.png` except […]" —
and nowhere else.

### 1. Avatar imagery — initials placeholder

`creator_profiles` has **no avatar/image column**. The designed row shows a real 48×48
photo. **Decision (approved in `pl-bbca` planning):** ship an **initials placeholder** in the
48×48 / radius-8 slot and carry this as an enumerated delta rather than inventing a column
mid-slice or dropping the thumbnail and deviating structurally.

> `/discover` matches `design.png` except **[avatar imagery: initials placeholder rendered in
> > the 48×48 radius-8 slot in place of the designed photo]**.

Keep the geometry exact — 48×48, radius 8, `#d9d9d9` plate — so closing the delta is a fill
swap, not a relayout. Real imagery is filed as **`resonance-0407`**; that seed removes this
line from the parity statement.

### 2. Content column x-offset

Building the centred **x=514** from the sibling frames rather than this frame's x=527.
Rationale above. A 13px horizontal delta against _this_ `design.png` is expected and correct.

### 3. Weave badge semantics — `PROVISIONAL`

Every one of the 13 rows carries `Symbol/Weave/24px`. Whether the badge is unconditional
chrome or conditional on some creator attribute **cannot be determined from a frame where
all rows have it**, and there is no such attribute in `creator_profiles` today. Ship it
unconditionally and mark it `PROVISIONAL`; resolve with the designer.

## Notes for the builder (step 4 — `resonance-7a42`)

- Three of the four tabs have **no data source** this slice: `Offering` is only
  `{title, description}` and `@resonance/community` is a stub. Products/Services/Posts render
  **designed empty states** that must be visually distinct from a zero-result Creators
  search (risk 7 in `pl-bbca` — an RTL test asserts the two states differ).
- The `Follow`/`Following` control is **functional** this slice; follows were pulled forward
  from Slice B specifically so this button is not dead on the primary screen.
- Everything in the two left rails already exists as `@resonance/ui` `AppNav` (80px) +
  the Weave rail, built for the interview screen (`resonance-6e42`). Compose them; do not
  rebuild. Promoting `AppNav` into a shared authed layout is listed as open in `_index.md`
  and is step 5's (`resonance-c7db`) job.
