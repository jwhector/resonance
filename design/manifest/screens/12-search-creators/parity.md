# `/discover` — parity (ADR-0019)

**`/discover` matches `design.png` except** —

1. **[content column x]** built at the centred **x=514** shared by the three sibling Search
   frames, not this frame's scaffolding **x=527**. Ratified in `design.md` § delta 2. A 13px
   horizontal offset against _this_ `design.png` is expected and correct.
2. **[avatar imagery]** an **initials placeholder** on the designed `#d9d9d9` plate fills the
   48×48 / radius-8 slot; `creator_profiles` has no image column. Ratified in `design.md`
   § delta 1 — `resonance-0407`.
3. **[“By &lt;person&gt;” attribution]** the subtitle slot renders the creator's **`headline`**;
   no attribution field exists in `CreatorResult` or `creator_profiles`. Ratified in `design.md`
   § delta 2 (row spec) — `resonance-af4a`.
4. **[`Weave/Sidebar` 40px column at x=81]** not built. Its width is reserved as a `pl-10`
   gutter so the content column still lands at x=514, so the diff shows an empty 40px band
   there. Expected — `resonance-cd40`. **Do not re-centre the column to close it.**
5. **[page background]** the surface right of the rail is **`#f2f2f2`** (the design system's
   `--color-background`), where every Member/Search frame is **`#ffffff`**. **NEW this pass, not
   previously enumerated** — `resonance-b656`.
6. **[app rail inventory]** `AppNav` shows six items (wave mark, home, box, calendar, indigo
   circle, gradient circle); this frame's `Frame 49` draws three (wave mark, `Icon/Home`,
   `ProfileImg/Circle/40px`). **NEW this pass** — `resonance-8619`. The wave/Weave marks are
   still `bg-brand-gradient` placeholders rather than the real SVG assets (`resonance-cbbb`).
7. **[row follow states]** every captured row shows `Follow`; the frame shows two of thirteen as
   `Following`. The capture is **signed out** (see _Capture_ below), and a signed-out row is
   `followState: "unknown"`, which renders the default affordance by contract. Not a build
   deviation — a capture-state difference. The `Following` treatment is **`PROVISIONAL`** here:
   it is **not** in this `app.png` and therefore **not pixel-verified** on this screen.
8. **[`next dev` overlay]** the dark circular Dev Tools button at the bottom-left is injected by
   `next dev`, not the app. Present in every `app.png` in this manifest (see `04-interview`).
9. **[glyph rasterisation]** 2–4% of pixels inside the chrome bands differ at the antialiasing
   edges of text and icons — Figma's rasteriser vs Chromium's. Not a geometry or colour delta;
   see the measured bands below.

Everything else is byte-for-byte or measurement-exact. **Nothing on this screen is a prose
claim** — the numbers below are what was read off the running app and off the two PNGs.

---

## Capture

|          |                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route    | `/discover?q=Tinctures` — the frame's own sample query, so the captured `SearchBar` carries the designed text                                           |
| Server   | `E2E_HARNESS=1 PORT=3001 pnpm --dir apps/web dev`, real Neon DB                                                                                         |
| Viewport | 1512×982, `deviceScaleFactor: 2` → `app.png` 3024×1964 (the manifest's convention; `design.png` is native 1512×982)                                     |
| Settle   | `waitUntil: "networkidle"` + 800ms, matching `apps/web/scripts/capture-route.mjs`                                                                       |
| Session  | **anonymous**                                                                                                                                           |
| Data     | eight ready creator profiles seeded with embedded content identical to the query (so they fill the visible page), removed immediately after the capture |

**Why the capture is anonymous, and why that is not `capture-route.mjs`.** The manifest's capture
primitive authenticates before navigating. Migration `0003` — the `follows` table — is **not
applied to the dev Neon database** (`resonance-7912`), and `searchCreatorProfiles` only emits its
`exists (select 1 from follows …)` sub-select when a viewer is present, so an **authenticated**
ranked search 500s while an anonymous one is fine. `/discover` is session-optional by design and a
signed-out row renders the identical `Follow` affordance the frame draws, so the anonymous capture
is the faithful one obtainable today. Re-capture through `capture-route.mjs` once `0003` is
applied, and delta 7 above should collapse to the designed mix of `Follow`/`Following`.

---

## Measured — live DOM geometry and computed colour

Read with `getBoundingClientRect()` + `getComputedStyle()` on the running page at 1512×982.
`design` values are `design.md`'s, which were read off the frame.

| Element             | design                                                                   | app                                                                                     |                                                              |
| ------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| content column      | 604 wide @ **x=514** (centred; frame scaffolds 527)                      | `x=514 w=604`                                                                           | ✅                                                           |
| `SearchBar/Filled`  | `604×56` @ `y=40`, radius 8, border 1px `#cdcdcd`, bg `#ffffff`          | `x=514 y=40 604×56`, radius `8px`, border `rgb(205,205,205) 1px`, bg `rgb(255,255,255)` | ✅                                                           |
| query text          | Helvetica Neue Regular 16/24, `#2b2b2b`                                  | `"Helvetica Neue" 400 16px/24px`, `rgb(43,43,43)`                                       | ✅                                                           |
| `Tabs/Search`       | `604×49` @ `y=136`, four fixed 151px tabs                                | `x=514 y=136 604×49`; tabs `151×49`                                                     | ✅                                                           |
| tab label           | Helvetica Neue Medium 22/30; active `#2b2b2b`, idle `#a6a6a6`            | `500 22px/30px`; `rgb(43,43,43)` / `rgb(166,166,166)`                                   | ✅                                                           |
| tab underline       | `151×2`; active `#2b2b2b`, idle `#a6a6a6`, drawn under **every** tab     | `151×2` @ `y=183`; `rgb(43,43,43)` / `rgb(166,166,166)`, all four present               | ✅                                                           |
| label→rule gap      | 17                                                                       | `136+30 → 183` = 17                                                                     | ✅                                                           |
| result list         | starts `y=225`, rows `604×48`, gap 24                                    | `y=225`; `row0 y=225 h=48`, `row1 y=297` (pitch 72)                                     | ✅                                                           |
| avatar slot         | `48×48`, radius 8, `#d9d9d9` plate                                       | `48×48`, radius `8px`, `rgb(217,217,217)`                                               | ✅ geometry (delta 2 = fill)                                 |
| display name        | Helvetica Neue Medium 16/24, `#000000`, 16 from avatar                   | `x=578` (=514+48+16), `500 16px/24px`, `rgb(0,0,0)`                                     | ✅                                                           |
| `Symbol/Weave/24px` | `24×24`, gap 16 after the name                                           | `x=686.48` (=578+92.48+16), `24×24`                                                     | ✅ geometry (`PROVISIONAL` semantics, `design.md` § delta 3) |
| subtitle            | Helvetica Neue Regular 16/24, `#a6a6a6`                                  | `y=249`, `400 16px/24px`, `rgb(166,166,166)`                                            | ✅ (delta 3 = the sentence)                                  |
| `Follow` button     | h 48, radius 8, fill `#6034ff`, label `#ffffff`, width hug (81 in frame) | `h=48`, radius `8px`, `rgb(96,52,255)`, `rgb(255,255,255)`, `w=80.63`                   | ✅                                                           |
| column right edge   | 514+604 = 1118                                                           | button right edge `1037.38+80.63 = 1118.01`                                             | ✅                                                           |
| app rail            | 80 wide, white, hairline at x=80                                         | `x=0 w=80`, `rgb(255,255,255)`                                                          | ✅ box (delta 6 = contents)                                  |
| page background     | `#ffffff`                                                                | `body` = `rgb(242,242,242)`                                                             | ❌ **delta 5**                                               |

`#6034ff` is now the real brand primary in the app — `resonance-4be7` (the token swap) is closed,
and the byte histogram below confirms it rather than trusting the token name.

## Measured — pixel bytes

Sampled from the two PNGs (`app.png` downscaled 3024→1512 for like-for-like comparison).

| sample                                | `design.png` | `app.png`                     |
| ------------------------------------- | ------------ | ----------------------------- |
| page background (300,500)             | `#ffffff`    | `#f2f2f2` ← delta 5           |
| app rail (40,500)                     | `#ffffff`    | `#ffffff`                     |
| `Weave/Sidebar` column (100,500)      | `#ffffff`    | `#f2f2f2` ← delta 4 + delta 5 |
| search-bar fill                       | `#ffffff`    | `#ffffff`                     |
| `Follow` button fill (band histogram) | `#6034ff`    | `#6034ff`                     |
| avatar plate                          | photo        | `#d9d9d9` ← delta 2           |

Band diffs, comparing the design column at x=527 against the app column at x=514 (i.e. with
ratified delta 1 applied). Tolerance 20/channel excludes the flat 13/channel background delta so
the structure is what is being measured:

| band                                 | pixels differing                                                                         |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| tab underline row (`y=183..185`)     | **0.00 %** — pixel-identical                                                             |
| `Tabs/Search` band (`y=136..185`)    | 3.89 % — glyph antialiasing only                                                         |
| `SearchBar/Filled` band (`y=40..96`) | 2.07 % — glyph + `×` icon antialiasing                                                   |
| empty page background block          | 0.00 % at tol 20 / **100 % at tol 12**, max Δ = 13 — i.e. exactly `#ffffff` vs `#f2f2f2` |

Without the 13px shift the search-bar band rises from 2.07 % to 3.60 %, which is the offset
showing up as a measurement rather than as an assertion.

---

## Not verified on this screen

Stated so the parity claim above cannot be read as covering them.

- **The `Following` button treatment** (`#f2f2f2` fill, `#2b2b2b` label, width 104). Not in this
  `app.png` — see delta 7. `PROVISIONAL`.
- **`SearchBar` placeholder copy.** The frame is a _filled_ field and gives no placeholder; the
  app ships `"Search on Resonance"` from the sibling `Member/Search/Home` bar. `PROVISIONAL`,
  as `design.md` already states.
- **The `NoResultsState` surface.** Unreachable through the UI: the query carries no default
  similarity floor, so a Creators search against a populated database always returns rows.
  Covered at component level by `apps/web/app/(app)/discover/discover-client.test.tsx`, which
  asserts it is distinct from both the coming-soon and idle surfaces, and by
  `packages/ui`'s empty-state tests. **No pixel claim is made about it.**
- **The `ComingSoonState` surface** (Products / Services / Posts). Those frames are screens
  09–11 and have no `app.png`; this pass captured only screen 12. E2E asserts the three tabs
  render distinct copy, but that is behaviour, not parity.

## Provenance

`design.png` is `copy-derived` from `vC0O5uyMmw1o5vYHmCoOXq` node `1443:78153`, SHA-256
`f5c8377d439ccd90a904ee59aaae3b161f78dc0e8bbe7f8d17ee0de7677ba5f8` — see `design.md` and
[`../../PROVENANCE.md`](../../PROVENANCE.md). This parity pass did **not** re-read Figma and
cites no node id that is not already in `design.md`.
