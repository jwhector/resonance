# Member/Search/Home — design spec

The **member feed home**, and the screen that owns the search entry point. Despite the
`Search` path segment this is not a results screen: search appears here as a single bar in
the right rail.

**No slice owns this screen yet, and no parity claim is made about it.** It was assigned to
Slice B (`resonance-8c96`) when that slice was planned; the assignment was withdrawn on the
evidence of this very spec. The frame draws the home as a **post feed** with a composer and a
Cart rail, and `@resonance/community` holds a `Post` type and nothing else — the composer,
posts, likes and cart are all Slice C (`resonance-537e`), so building this now would ship a
dead surface. Slice B shipped the interest picker (screen 13) and spent it on `/discover`
instead. Nothing on `/discover` is an attempt at this frame.

## Provenance

```
fileKey:         vC0O5uyMmw1o5vYHmCoOXq        # "Resonance (Copy)", page MVP
nodeId:          1443:78098                    # Member/Search/Home
capturedAt:      2026-07-26T23:41:08Z
capturedVia:     Desktop Bridge plugin — figma_execute + node.exportAsync({PNG, SCALE 1})
designPngSha256: fe6c67e2c1eb575827711493170a54dabc8cb9d6e787e9625239eaab11f0513a
figmaVersionId:  UNAVAILABLE
provenance:      copy-derived
```

**Figma version ids are not obtainable** — `FIGMA_ACCESS_TOKEN` returns `403`, so REST
including `get_file_versions` is dead. **The SHA-256 of `design.png` is the substitute drift
detector**; `exportAsync` at a fixed scale is byte-reproducible. See
[../../PROVENANCE.md](../../PROVENANCE.md) and `resonance-6db8`.
Node inventory: [../../metadata/member-search-frames.md](../../metadata/member-search-frames.md).

- **Frame:** 1512×982, bg `#ffffff`. The inner content frame is **2534** tall — the frame is a
  scroll viewport onto a much longer feed.
- **Code status:** `orphan-design`. No parity claim is made — there is no `app.png`.

## Layout

| Region                 | x    | w   | Notes                                          |
| ---------------------- | ---- | --- | ---------------------------------------------- |
| `Sidebar/Customer/MVP` | 1    | 80  | same rail as every other member screen         |
| `Weave/Sidebar`        | 81   | 40  | Weave symbol + dropdown arrow                  |
| centre feed            | 194  | 716 | `Frame 1000002696`, VERTICAL, **gap 40**       |
| right rail             | 1037 | 395 | `Frame 1000002697`, VERTICAL, **gap 24**, y=40 |

Centre feed, from y=40:

- `Home/TopBar` — 716×80: member avatar + a composer field reading
  **"What's on your mind?"**
- `Post` ×2 (716×763, 716×684), then a further `Post` below the fold at y=1595.

## Right rail — the search entry (the part Slice A cares about)

- `SearchBar/Filled` `1443:78102` — **395×56**, bg `#ffffff`, border 1px `#cdcdcd`, radius **8**.
  Placeholder reads **"Search on Resonance"** with a leading `Icon/Search`.
  This is the **only placeholder string the design supplies** for the search input; the
  results frames all show a filled query instead. Reuse it.
  Same component as the results screens' bar (`SearchBar/Filled`) at a narrower width —
  build one component, two widths, not two components.
- `Panel/Home` `1443:78103` — **395×284**, border 1px `#cdcdcd`, radius **8**: a **Cart**
  panel. Heading "Cart", empty state **"Your cart is empty"**, footer row
  **"Subtotal: $0"** + a `Buy now` button (white fill, dark outline).

## Notes

- Commerce is display-only until Slice C, so the Cart panel is **not** in Slice A or B scope.
- The feed rows use a **circular** avatar (`ProfileImg/Circle`), where the Creators search
  results use a **square, radius-8** one. Both variants are needed — see `resonance-0407`.
- Post cards carry an engagement footer: comment count, heart count, a Weave-wave count, and
  the Weave symbol. Not specced here; Slice C's frame to read (`resonance-537e`).
- This screen has **no tab bar**. The `Products|Services|Posts|Creators` tabs only appear
  once a query has been run (screens 09–12).
