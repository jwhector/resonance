# Member/Search/Result/Services — design spec

The **Services** tab of the search results screen. Slice A ships this tab as a **designed
empty state** — same reason as Products: `Offering` carries no service/scheduling data, so
there is nothing to render.

## Provenance

```
fileKey:         vC0O5uyMmw1o5vYHmCoOXq        # "Resonance (Copy)", page MVP
nodeId:          1443:78133                    # Member/Search/Result/Services
capturedAt:      2026-07-26T23:41:08Z
capturedVia:     Desktop Bridge plugin — figma_execute + node.exportAsync({PNG, SCALE 1})
designPngSha256: 839872532a9bbe5a5106094ae7e3042032ea352967b0bcf5892298e0bc51a312
figmaVersionId:  UNAVAILABLE
provenance:      copy-derived
```

**Figma version ids are not obtainable** — `FIGMA_ACCESS_TOKEN` returns `403`, so REST
including `get_file_versions` is dead. **The SHA-256 of `design.png` is the substitute drift
detector**; `exportAsync` at a fixed scale is byte-reproducible. See
[../../PROVENANCE.md](../../PROVENANCE.md) and `resonance-6db8`.
Node inventory: [../../metadata/member-search-frames.md](../../metadata/member-search-frames.md).

- **Frame:** 1512×982, bg `#ffffff`. Content column is **1863** tall — scrolls.
- **Code status:** `orphan-design` for the card; the **chrome** is built in Slice A.
  No parity claim — there is no `app.png`.

## Shared chrome — identical to screens 09, 11, 12

`Main` at x=120; content column `Frame 1000002703` at **x=514, y=40, w=604**, VERTICAL **gap 40**:

```
y=40    SearchBar/Filled  1443:78138   604×56
y=136   Tabs/Search       1443:78139   604×49   ← Services active
y=225   card list         1443:78140   604×n    VERTICAL, gap 40
```

Full spec for `SearchBar/Filled` and `Tabs/Search` lives in
[`../12-search-creators/design.md`](../12-search-creators/design.md).

## Service card (Slice C — not built in Slice A)

Structure read off `design.png`, `PROVISIONAL` — only the frame-level tree was resolved
in-session. It is the product card **plus scheduling and location**, and **minus** the
`Option` variant select:

- Header row: circular creator avatar, creator name, age (`2d`), `By <person>`, `···`.
- **Media** — full-column-width image, radius ~8.
- **Title** (e.g. "Dream Retreat") + **price** (e.g. `$110`).
- **Date/time row** — calendar icon + range, e.g. `15:00 15th May - 12:00 17th May`.
- **Location row** — pin icon + street address, with a right-aligned muted
  **`View on Map`** link.
- **Description** — body text.
- **`Quantity`** label + a numeric select (`1`) with a chevron — where Products has `Option`.
- Actions: **`Add to cart`** (brand `#6034ff`, white label) + **`Buy now`** (white,
  `#cdcdcd` outline).
- **Attendance line** below the actions: stacked participant avatars +
  _"Brooklyn Simmons and Wade Warren are going"_ — a social-proof element Products has no
  equivalent of.

## Slice A empty state

Renders a **designed empty state**, visually distinct from a zero-result Creators search
(risk 7 in `pl-bbca`). Copy is `PROVISIONAL`, signed off in review under step 4
(`resonance-7a42`).
