# Member/Search/Result/Posts — design spec

The **Posts** tab of the search results screen. Slice A ships this tab as a **designed empty
state**: `@resonance/community` is a one-file typed stub, so posts have no data source.

## Provenance

```
fileKey:         vC0O5uyMmw1o5vYHmCoOXq        # "Resonance (Copy)", page MVP
nodeId:          1443:78143                    # Member/Search/Result/Posts
capturedAt:      2026-07-26T23:41:08Z
capturedVia:     Desktop Bridge plugin — figma_execute + node.exportAsync({PNG, SCALE 1})
designPngSha256: f87c49e228561e66d5bb174b19fbaa2628229cde973bbcf539d9a9dfcdb43013
figmaVersionId:  UNAVAILABLE
provenance:      copy-derived
```

**Figma version ids are not obtainable** — `FIGMA_ACCESS_TOKEN` returns `403`, so REST
including `get_file_versions` is dead. **The SHA-256 of `design.png` is the substitute drift
detector**; `exportAsync` at a fixed scale is byte-reproducible. See
[../../PROVENANCE.md](../../PROVENANCE.md) and `resonance-6db8`.
Node inventory: [../../metadata/member-search-frames.md](../../metadata/member-search-frames.md).

- **Frame:** 1512×982, bg `#ffffff`. Content column is **1409** tall — scrolls.
- **Code status:** `orphan-design` for the card; the **chrome** is built in Slice A.
  No parity claim — there is no `app.png`.

## Shared chrome — identical to screens 09, 10, 12

`Main` at x=120; content column `Frame 1000002704` at **x=514, y=40, w=604**, VERTICAL **gap 40**:

```
y=40    SearchBar/Filled  1443:78148   604×56
y=136   Tabs/Search       1443:78149   604×49   ← Posts active
y=225   card list         1443:78150   604×n    VERTICAL, gap 40
```

Full spec for `SearchBar/Filled` and `Tabs/Search` lives in
[`../12-search-creators/design.md`](../12-search-creators/design.md).

## Post card (Slice B — not built in Slice A)

Structure read off `design.png`, `PROVISIONAL` — only the frame-level tree was resolved
in-session. Lighter than the commerce cards: **no price, no select, no cart actions.**

- Header row: circular avatar, author name (HN Medium), age (`2d`), `···` overflow right.
  A **creator** post also carries a `By <person>` sub-line in `#a6a6a6`; the member post in
  this frame (_Leslie Alexander_) does **not** — the sub-line is conditional on the author
  being a creator profile rather than a person.
- **Title** — large heading (e.g. "Brewing a new potion!"). Emoji render inline in the title.
- **Body** — multi-line body text, sitting **above** the media (the commerce cards put media
  first).
- **Media** — optional full-column-width image, radius ~8. The second post in the frame is
  text-only, so media is not required.
- Engagement footer: comment count, heart count, and the Weave symbol. **No Weave-wave count**
  on this card, unlike the Products/Services cards — `PROVISIONAL`, may be sample-data noise
  rather than a rule.

## Slice A empty state

Renders a **designed empty state**, visually distinct from a zero-result Creators search
(risk 7 in `pl-bbca`). Copy is `PROVISIONAL`, signed off in review under step 4
(`resonance-7a42`).
