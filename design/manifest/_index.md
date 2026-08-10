# Manifest index — Creator Interview → ProfileGen · Member Search

Screen ⇄ route ⇄ component ⇄ verified Figma node ⇄ status. See [README.md](README.md) for
the protocol (R1–R4) and the **Capture notes** (the REST path is dead — use the Desktop
Bridge).

**Two source files.** Screens **01–07** were captured from `UYlkCL7jkCVgKWiqAVlEFp`; screens
**08–13** from `vC0O5uyMmw1o5vYHmCoOXq` (`Resonance (Copy)`), which is the file the Desktop
Bridge is connected to. Node ids resolve in both — that is the hazard, not the reassurance.
Read [PROVENANCE.md](PROVENANCE.md) before adding a citation.

## ★ Golden rule — the Figma is the definitive source of truth (zero drift)

**Match the professional Figma frames pixel-for-pixel; drive drift to zero; never make
assumptions where the design is definitive — read the frame.** This is the antidote to the
audit's root cause: every gap came from an assumption substituting for the design.

A _pattern_ to notice — **a lens, not a rule**: across this design, content tends to live
inside the Weave conversation rather than in separate cards/panels/layers (signup/verify are
cardless centered text + the Resonance logo; the ProfileGen draft is woven inline into the
conversation; the interview is one full-bleed surface). Use it as a sanity check, but
**defer to the actual frame per screen, including any exceptions** — do not generalize it
into a rule that overrides the design.

## Screens

| #   | Screen                                | Figma node   | Route                            | Component                                             | Citation (R1)           | Status                                                                        |
| --- | ------------------------------------- | ------------ | -------------------------------- | ----------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| 01  | What brought you?                     | `1519:78312` | `/start`                         | `intent-picker-card`                                  | ✅ valid                | 🟢 built to design (cardless/boxed-radio/gray-disabled) · `resonance-c2d2`    |
| 02  | Create account                        | `1526:78839` | `/signup`                        | `create-account-card`                                 | ✅ valid                | 🟢 reconciled (cardless/mark/gray-disabled/"Continue") · `c7c9`+`dba0`        |
| 03  | Email verify (OTP)                    | `1526:79050` | `/verify`                        | `email-verify-card`                                   | ✅ valid                | 🟢 reconciled (cardless/OTP/gray-disabled) · `resonance-c7c9`                 |
| 04  | Interview                             | `1443:78282` | `/onboarding/creator`            | `app-nav` + `weave-interview-rail` + `weave-composer` | ✅ `1443:78283` (fixed) | 🟢 rebuilt to design (start state) · `resonance-6e42`                         |
| 05  | ProfileGen draft                      | `1473:81622` | `/onboarding/creator` (post-gen) | `profile-draft-panels`                                | ✅ valid                | 🟢 reconciled (woven inline + bottom composer) · `resonance-c7c9`             |
| 06  | Onboarded                             | `1443:78273` | —                                | —                                                     | n/a                     | 🟡 orphan-design → **DEFER** (blocked on commerce/community stubs, bcd9)      |
| 07  | Sign in (`Onboarding/Creator/SignIn`) | `1463:71449` | —                                | —                                                     | ✅ valid                | 🟡 orphan-design → **DEFER** · **row corrected, see note** (`resonance-80bf`) |

### Correction — row 07 (`resonance-80bf`)

This row previously read **"Member feed home"** with the qualifier "NOT a sign-in form".
Both halves were wrong. Resolved live against the Figma document, node `1463:71449` is named
**`Onboarding/Creator/SignIn`** — it is the **logged-out member home**, i.e. the sign-in
surface. **It is not a search screen** and never was; the four real search frames are rows
08–12 below, none of which had been captured before this seed. Anything that reasoned about
`1463:71449` as the member feed or as a discovery surface was reasoning about the wrong frame.
The member **feed** home is row 08, `Member/Search/Home` `1443:78098`.

## Screens — Member / Search (Slice A, `pl-bbca`)

Captured from `vC0O5uyMmw1o5vYHmCoOXq` (`Resonance (Copy)`), page MVP, `2026-07-26T23:41:08Z`,
via the Desktop Bridge. All five are **`copy-derived`** — see [PROVENANCE.md](PROVENANCE.md).
Node inventory: [`metadata/member-search-frames.md`](metadata/member-search-frames.md).

| #   | Screen                          | Figma node   | Route       | Component                                        | Citation (R1) | Status                                                                                                                                                             |
| --- | ------------------------------- | ------------ | ----------- | ------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 08  | Member feed home (search entry) | `1443:78098` | —           | — (right-rail `SearchBar`, Cart panel)           | ✅ valid      | 🟡 orphan-design — **not claimed by Slice B**; the feed shell needs posts, a composer and a cart, all Slice C (`resonance-537e`). See the note under Slice B below |
| 09  | Search results · Products       | `1443:78123` | `/discover` | tab bar + product card                           | ✅ valid      | 🟡 chrome in Slice A; **card deferred to Slice C** — ships as a designed empty state                                                                               |
| 10  | Search results · Services       | `1443:78133` | `/discover` | tab bar + service card                           | ✅ valid      | 🟡 chrome in Slice A; **card deferred to Slice C** — ships as a designed empty state                                                                               |
| 11  | Search results · Posts          | `1443:78143` | `/discover` | tab bar + post card                              | ✅ valid      | 🟡 chrome in Slice A; **card deferred to Slice C** — ships as a designed empty state                                                                               |
| 12  | **Search results · Creators**   | `1443:78153` | `/discover` | `SearchBar` + `Tabs/Search` + `CreatorResultRow` | ✅ valid      | ⚠️ **built, parity captured** — 9 enumerated deltas ([`parity.md`](screens/12-search-creators/parity.md)) · `resonance-3f15`                                       |

Screens 09–12 share one chrome: `SearchBar/Filled` 604×56 + `Tabs/Search` 604×49
(`Products｜Services｜Posts｜Creators`), content column 604 wide at x=514, stack gap 40. The full
component spec lives once, in [`screens/12-search-creators/design.md`](screens/12-search-creators/design.md).

**Enumerated parity delta carried into Slice A** — `creator_profiles` has no avatar/image
column, so result rows ship an **initials placeholder** in the designed 48×48 radius-8 slot.
Real imagery is filed as **`resonance-0407`**.

**`/discover` parity is now captured** (`resonance-3f15`): _"matches `design.png` except
[content column x=514 · avatar imagery · “By &lt;person&gt;” attribution · absent `Weave/Sidebar`
column · page background `#f2f2f2` vs `#ffffff` · `AppNav` rail inventory · signed-out row follow
states · `next dev` overlay · glyph antialiasing]"_. Four of those were ratified before the build
(`resonance-0407`, `resonance-af4a`, `resonance-cd40`, and the x=514 decision); two are **new**
and filed as `resonance-b656` (background) and `resonance-8619` (rail inventory). Full evidence —
DOM measurements, pixel samples and band diffs — in
[`screens/12-search-creators/parity.md`](screens/12-search-creators/parity.md).

## Screens — Member / Onboarding (Slice B, `pl-496f`)

Captured from `vC0O5uyMmw1o5vYHmCoOXq` (`Resonance (Copy)`), page MVP, `2026-07-29T07:04:23Z`,
via the Desktop Bridge. **`copy-derived`** — see [PROVENANCE.md](PROVENANCE.md). Node
inventory: [`metadata/member-onboarding-selection.md`](metadata/member-onboarding-selection.md).

| #   | Screen            | Figma node   | Route                         | Component                       | Citation (R1) | Status                                                                                                                     |
| --- | ----------------- | ------------ | ----------------------------- | ------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 13  | **Select topics** | `1554:79520` | — (wired by `resonance-3a7d`) | `TopicPicker` (+ `tagVariants`) | ✅ valid      | ⚠️ **built, parity captured** — 8 enumerated deltas ([`parity.md`](screens/13-select-topics/parity.md)) · `resonance-9e66` |

Parity is stated as: _"matches `design.png` except [content column centred at x=506 vs the
frame's x=530 · the frame's duplicate "Art" chip · a wrap instead of three fixed row frames ·
chip widths 0.1–1.0px narrower from glyph advance · a `font-semibold` Continue label vs the
frame's Medium · the `ResonanceMark` approximation · the selected-chip state verified against
the `Tags` component set rather than this frame · unselected chips dimming at the selection
cap]"_. Geometry, computed styles, band diffs and point samples are in
[`screens/13-select-topics/parity.md`](screens/13-select-topics/parity.md).

Only one delta is new and open — the button label weight, filed as **`resonance-e16b`**. The
mark approximation is the existing `resonance-cbbb`; the rest are ratified or non-actionable.

### Screen 08 stays orphan-design — Slice B did **not** claim it

Screen 13 is the **only** frame Slice B built. Row 08 (`Member/Search/Home` `1443:78098`) was
assigned to this slice when it was planned, and that assignment is now withdrawn: the frame draws
the member home as a **post feed** — a 710px centre column of Post cards with a "What's on your
mind?" composer, beside a Cart right rail — and `@resonance/community` holds a `Post` type and
nothing else. The composer, posts, likes and cart are all Slice C (`resonance-537e`), so building
the frame now would have shipped a dead surface. Slice B spent the interests capability on the
surface that already exists instead: `/discover`'s empty-query state ranks creators by the
member's stored interest vector.

**No parity claim is made about screen 08, and none should be read into `/discover`.** A populated
empty-query `/discover` is _not_ an attempt at `1443:78098` and must not be reviewed as a
regression against it — the two are different screens with different frames. `/discover`'s only
parity contract remains screen 12.

Two things about this row are unlike 01–12:

- **`app.png` is an offline capture of the component in isolation**, not a route screenshot —
  the route that hosts `TopicPicker` is a later step in the same plan. The real `theme.css` is
  compiled into the capture page so the tokens are the shipped ones. See `parity.md` § _How
  this was captured_.
- **The frame is not the whole contract.** It draws every chip unselected, so the selected
  treatment comes from the `Tags` component set (`1409:46348`), captured alongside as
  `design-tag-variants.png`.

**Legend:** 🟢 built & clean · ⚠️ built with open deltas · 🔴 built, wrong model · 🟡 in Figma, not built.

## Artifact coverage

| Screen                                   | design.png | design.md |     app.png     |
| ---------------------------------------- | :--------: | :-------: | :-------------: |
| 01 what-brought-you                      |     ✅     |    ✅     |       ✅        |
| 02 create-account                        |     ✅     |    ✅     |       ✅        |
| 03 verify-email                          |     ✅     |    ✅     |       ✅        |
| 04 interview                             |     ✅     |    ✅     | ✅ (+populated) |
| 05 profile-draft                         |     ✅     |    ✅     | ✅ (+published) |
| 06 onboarded                             |     ✅     |    ✅     |   — (orphan)    |
| 07 sign-in (`Onboarding/Creator/SignIn`) |     ✅     |     —     |   — (orphan)    |
| 08 search-home                           |     ✅     |    ✅     |   — (orphan)    |
| 09 search-products                       |     ✅     |    ✅     |   — (orphan)    |
| 10 search-services                       |     ✅     |    ✅     |   — (orphan)    |
| 11 search-posts                          |     ✅     |    ✅     |   — (orphan)    |
| 12 search-creators                       |     ✅     |    ✅     |  ✅ (+parity)   |
| 13 select-topics                         |     ✅     |    ✅     |  ✅ (+parity)   |

Row 07's label is now the frame's **real Figma name**. It was previously listed here as
"07 sign-in" while the screens table above called the same node "Member feed home" — the two
tables disagreed with each other and the screens table disagreed with Figma. Both are
corrected. `1463:71449` is the sign-in screen; it is **not** a search screen. See the
correction note above.

Screen **12** now has both an `app.png` and a `parity.md` (`resonance-3f15`). Screens **08–11**
still have **no `app.png` and no `parity.md`, by design**: 08 is a feed shell no slice has built
(Slice B deliberately did not — see the note above), and 09–11 ship as designed empty states
rather than as the card layouts their frames draw. Per R2, no parity claim may be made about any
of those four — the E2E asserts their tabs render distinct copy, which is behaviour, not parity.

## Cross-cutting findings (decide once, not per-screen)

- **No card/panel chrome (the pattern above).** signup/verify are cardless centered text (+ the
  Resonance logo the app omits); the ProfileGen draft belongs inline in the conversation, not a
  standalone panel; the interview is one full-bleed surface. Verify each against its frame — don't assume.
- **Persistent shell chrome.** The authenticated screens share a persistent **~80px left
  app-nav + Weave sidebar** chrome. Built as `@resonance/ui` `AppNav` (80px rail) + the
  full-bleed `WeaveInterviewRail`, composed by the interview screen (`resonance-6e42`).
  **`AppNav` is now a shared layout** — `apps/web/app/(app)/layout.tsx` (`resonance-c7db`) — so
  `/onboarding/creator`, `/creator/[id]` and `/discover` all carry the rail. Still open: the
  design's separate 40px `Weave/Sidebar` column (x=81, w=40) is not built as a component; on
  `/discover` it is reserved as a plain gutter so the content column lands at the ratified
  x=514, and the rail's own section icons remain inert placeholders (`resonance-cbbb`).
- **Literal hexes vs tokens.** Headings/body sometimes use literal `#1e1e1e` / `#0a0a0a` /
  `#000` instead of the mapped `--gray-*` tokens; the "Weave" wordmark maps to `--gray-50`
  on onboarded vs `--gray-300` on the draft. One normalization decision.
- **Brand color.** The entire `--color-primary` ramp is stock Tailwind purple `#a855f7`; the
  design is indigo `#6034ff`. Brand-wide swap — `resonance-4be7`.
- **Component states.** verify "Continue" and the draft's primary action are drawn **disabled**
  by default; build both active + disabled. Match the button colors.
- **Image slots.** The onboarded hero is a flat `--primary #6034ff` fill standing in for a real
  `BackgroundImg` visual-asset slot — build an image slot with a primary fallback.
- **Design scaffolding to ignore.** onboarded has a stray detached "Contact" label/add-button
  (y≈1438–1505) outside the main flow — Figma scaffolding, do not build.

## Capture notes

**The procedure now lives in [README.md § Capture notes](README.md#capture-notes--how-to-actually-get-a-designpng-read-this-first).
Read it before capturing anything.** Short version: **REST is `403` and every REST tool is
dead** (`download_assets`, `get_screenshot`, `get_metadata`, `get_file_data`,
`get_file_versions`) — capture through the **Desktop Bridge plugin** (`figma_execute` +
`node.exportAsync`) instead.

- **Screens 01–07** were captured with `download_assets` against `UYlkCL7jkCVgKWiqAVlEFp`,
  back when REST still worked. That path no longer exists; do not follow it.
- **Screens 08–12** were captured `2026-07-26T23:41:08Z` through the Desktop Bridge against
  `vC0O5uyMmw1o5vYHmCoOXq`, `exportAsync` at `SCALE 1` (native 1512×982), and are pinned by
  **SHA-256 of `design.png`** because **Figma version ids are unobtainable while REST is 403**.
  Hashes are reproducible — re-exporting an unchanged frame yields identical bytes.
- App renders captured with `apps/web/scripts/capture-app-manifest.mjs` under `E2E_HARNESS=1`.
- Figma **budget is no longer the binding constraint** — the bridge exports locally and does
  not consume the REST quota. The binding constraint is now bridge stability (it drops
  frequently; `figma_reconnect` and retry) and **provenance**, per `PROVENANCE.md`.
- Citations verified (`resonance-cbbd`, R1): `434:1194` (composer / `Input/Wide`), `1485:49379`
  (`TagGroup`), `1526:79082` (`Mail`) all confirmed via fresh `get_metadata`, saved in
  `metadata/component-citations.md`. The fabricated `1443:114245` is gone. No fabricated citations
  remain in `@resonance/ui`. Machine-checked Code Connect (R4) is deferred — see `resonance-a011`.
