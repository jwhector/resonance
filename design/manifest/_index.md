# Manifest index — Creator Interview → ProfileGen

Screen ⇄ route ⇄ component ⇄ verified Figma node ⇄ status. Design-side captured from
Figma file `UYlkCL7jkCVgKWiqAVlEFp` (node ids preserved across the team move). See
[README.md](README.md) for the protocol (R1–R4) and the budget funnel.

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

| #   | Screen             | Figma node   | Route                            | Component                                             | Citation (R1)           | Status                                                           |
| --- | ------------------ | ------------ | -------------------------------- | ----------------------------------------------------- | ----------------------- | ---------------------------------------------------------------- |
| 01  | What brought you?  | `1519:78312` | —                                | —                                                     | n/a                     | 🟡 orphan-design                                                 |
| 02  | Create account     | `1526:78839` | `/signup`                        | `create-account-card`                                 | ✅ valid                | ⚠️ built · card + logo + copy delta                              |
| 03  | Email verify (OTP) | `1526:79050` | `/verify`                        | `email-verify-card`                                   | ✅ valid                | ⚠️ built · card + state delta                                    |
| 04  | Interview          | `1443:78282` | `/onboarding/creator`            | `app-nav` + `weave-interview-rail` + `weave-composer` | ✅ `1443:78283` (fixed) | 🟢 rebuilt to design (start state) · `resonance-6e42`            |
| 05  | ProfileGen draft   | `1473:81622` | `/onboarding/creator` (post-gen) | `profile-draft-panels`                                | ✅ valid                | 🟡 now woven inline · panel reconcile pending (`resonance-c7c9`) |
| 06  | Onboarded          | `1443:78273` | —                                | —                                                     | n/a                     | 🟡 orphan-design                                                 |
| 07  | Sign in            | `1463:71449` | —                                | (signup+verify only)                                  | n/a                     | 🟡 orphan-design (likely)                                        |

**Legend:** 🟢 built & clean · ⚠️ built with open deltas · 🔴 built, wrong model · 🟡 in Figma, not built.

## Artifact coverage

| Screen              | design.png | design.md |     app.png     |
| ------------------- | :--------: | :-------: | :-------------: |
| 01 what-brought-you |     ✅     |    ✅     |   — (orphan)    |
| 02 create-account   |     ✅     |    ✅     |       ✅        |
| 03 verify-email     |     ✅     |    ✅     |       ✅        |
| 04 interview        |     ✅     |    ✅     | ✅ (+populated) |
| 05 profile-draft    |     ✅     |    ✅     | ✅ (+published) |
| 06 onboarded        |     ✅     |    ✅     |   — (orphan)    |
| 07 sign-in          |     ✅     |     —     |   — (orphan)    |

## Cross-cutting findings (decide once, not per-screen)

- **No card/panel chrome (the pattern above).** signup/verify are cardless centered text (+ the
  Resonance logo the app omits); the ProfileGen draft belongs inline in the conversation, not a
  standalone panel; the interview is one full-bleed surface. Verify each against its frame — don't assume.
- **Persistent shell chrome.** The authenticated screens share a persistent **~80px left
  app-nav + Weave sidebar** chrome. Built as `@resonance/ui` `AppNav` (80px rail) + the
  full-bleed `WeaveInterviewRail`, composed by the interview screen (`resonance-6e42`). Still
  wired only into `/onboarding/creator`; promoting `AppNav` into a shared authed layout across
  the other authenticated routes remains open.
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

- Design renders pulled with **`download_assets`** (exported node render → `design.png`), because
  `get_screenshot`/`get_metadata` did not re-register after the MCP restart — only
  `get_design_context` + `download_assets` did. `download_assets` tolerates parallel calls;
  `get_screenshot` did not.
- App renders captured with `apps/web/scripts/capture-app-manifest.mjs` under `E2E_HARNESS=1`.
- Figma budget: on the Pro-team file (moved from Starter). Full-slice capture cost ≈ 16 calls.
- Still to verify (step 6 / `resonance-cbbd`): component citations `434:1194` (composer), `1485:49379`
  (tag), `1526:79082` (mail-icon) — not yet confirmed against a metadata dump.
