# Member/Search/Result/Products — design spec

The **Products** tab of the search results screen. Slice A ships this tab as a **designed
empty state**: `Offering` is only `{title, description}` — no price, no image, no
product/service type — so there is no data source behind this frame. Kept in the manifest so
Slice C has the real contract to build against.

## Provenance

```
fileKey:         vC0O5uyMmw1o5vYHmCoOXq        # "Resonance (Copy)", page MVP
nodeId:          1443:78123                    # Member/Search/Result/Products
capturedAt:      2026-07-26T23:41:08Z
capturedVia:     Desktop Bridge plugin — figma_execute + node.exportAsync({PNG, SCALE 1})
designPngSha256: 9e51f51177dc6ea77d83c9c6c2c09c99f797a455a326431158e9ae768406cf7f
figmaVersionId:  UNAVAILABLE
provenance:      copy-derived
```

**Figma version ids are not obtainable** — `FIGMA_ACCESS_TOKEN` returns `403`, so REST
including `get_file_versions` is dead. **The SHA-256 of `design.png` is the substitute drift
detector**; `exportAsync` at a fixed scale is byte-reproducible. See
[../../PROVENANCE.md](../../PROVENANCE.md) and `resonance-6db8`.
Node inventory: [../../metadata/member-search-frames.md](../../metadata/member-search-frames.md).

- **Frame:** 1512×982, bg `#ffffff`. Content column is **1659** tall — scrolls.
- **Code status:** `orphan-design` for the card; the **chrome** is built in Slice A.
  No parity claim — there is no `app.png`.

## Shared chrome — identical to screens 10, 11, 12

`Main` at x=120; content column `Frame 1000002702` at **x=514, y=40, w=604**, VERTICAL **gap 40**:

```
y=40    SearchBar/Filled  1443:78128   604×56
y=136   Tabs/Search       1443:78129   604×49   ← Products active
y=225   card list         1443:78130   604×n    VERTICAL, gap 40
```

Full spec for `SearchBar/Filled` and `Tabs/Search` lives in
[`../12-search-creators/design.md`](../12-search-creators/design.md) — one component each,
shared across all four result tabs. Only the active tab differs.

Note the card list uses **gap 40**, where the Creators result list uses **gap 24**. Cards are
tall media blocks; rows are 48px lines.

## Product card (Slice C — not built in Slice A)

Structure read off `design.png`, `PROVISIONAL` — only the frame-level tree was resolved
in-session, not the card internals:

- Header row: circular creator avatar, **creator name** (HN Medium), age (`2d`) in grey,
  **`By <person>`** underneath in `#a6a6a6`, `···` overflow at the right.
- **Media** — full-column-width product image, radius ~8.
- **Title** — large heading (e.g. "Dream Current Elixir").
- **Price** — e.g. `$24`, below the title.
- **Description** — body text, truncated with a **"Show more"** link in brand `#6034ff`.
- **`Option`** label + a select (e.g. `Standard $24`) with a chevron.
- Actions: **`Add to cart`** — brand `#6034ff` fill, white label — and **`Buy now`** — white
  fill, `#cdcdcd` outline, dark label.
- Engagement footer: comment count, heart count, Weave-wave count, Weave symbol.

## Slice A empty state

This tab renders a **designed empty state**, and it must be **visually distinct from a
zero-result Creators search** — a member who searched and matched nothing, and a tab that
structurally cannot have results, are different situations and must not collapse into
identical blanks (risk 7 in `pl-bbca`; an RTL test asserts the distinction).

Empty-state copy is **not** in this frame. It is `PROVISIONAL`, signed off in review as part
of step 4 (`resonance-7a42`).
