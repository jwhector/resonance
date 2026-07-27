# Manifest index — Creator Interview → ProfileGen · Member Search

Screen ⇄ route ⇄ component ⇄ verified Figma node ⇄ status. See [README.md](README.md) for
the protocol (R1–R4) and the **Capture notes** (the REST path is dead — use the Desktop
Bridge).

**Two source files.** Screens **01–07** were captured from `UYlkCL7jkCVgKWiqAVlEFp`; screens
**08–12** from `vC0O5uyMmw1o5vYHmCoOXq` (`Resonance (Copy)`), which is the file the Desktop
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

| #   | Screen                          | Figma node   | Route       | Component                                        | Citation (R1) | Status                                                                                |
| --- | ------------------------------- | ------------ | ----------- | ------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------- |
| 08  | Member feed home (search entry) | `1443:78098` | —           | — (right-rail `SearchBar`, Cart panel)           | ✅ valid      | 🟡 orphan-design → **Slice B** (`resonance-8c96`) — feed shell, not a results screen  |
| 09  | Search results · Products       | `1443:78123` | `/discover` | tab bar + product card                           | ✅ valid      | 🟡 chrome in Slice A; **card deferred to Slice C** — ships as a designed empty state  |
| 10  | Search results · Services       | `1443:78133` | `/discover` | tab bar + service card                           | ✅ valid      | 🟡 chrome in Slice A; **card deferred to Slice C** — ships as a designed empty state  |
| 11  | Search results · Posts          | `1443:78143` | `/discover` | tab bar + post card                              | ✅ valid      | 🟡 chrome in Slice A; **card deferred to Slice B** — ships as a designed empty state  |
| 12  | **Search results · Creators**   | `1443:78153` | `/discover` | `SearchBar` + `Tabs/Search` + `CreatorResultRow` | ✅ valid      | 🟡 orphan-design → **the primary Slice A frame** (`resonance-7a42`, `resonance-c7db`) |

Screens 09–12 share one chrome: `SearchBar/Filled` 604×56 + `Tabs/Search` 604×49
(`Products｜Services｜Posts｜Creators`), content column 604 wide at x=514, stack gap 40. The full
component spec lives once, in [`screens/12-search-creators/design.md`](screens/12-search-creators/design.md).

**Enumerated parity delta carried into Slice A** — `creator_profiles` has no avatar/image
column, so result rows ship an **initials placeholder** in the designed 48×48 radius-8 slot.
`/discover` parity therefore reads _"matches `design.png` except [avatar imagery]"_. Real
imagery is filed as **`resonance-0407`**.

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
| 12 search-creators                       |     ✅     |    ✅     |   — (orphan)    |

Row 07's label is now the frame's **real Figma name**. It was previously listed here as
"07 sign-in" while the screens table above called the same node "Member feed home" — the two
tables disagreed with each other and the screens table disagreed with Figma. Both are
corrected. `1463:71449` is the sign-in screen; it is **not** a search screen. See the
correction note above.

Screens 08–12 have **no `app.png` and no `parity.md`, by design**: `/discover` does not exist
yet. These directories are the **design-side contract only**. Per R2, no parity claim can be
made about any of them until step 6 (`resonance-3f15`) captures the app side.

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
