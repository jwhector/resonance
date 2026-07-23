# Interview — parity (screen 04)

**Verdict:** `app.png` **matches `design.png`** (Figma `1443:78282`) for the captured
**start state**, except the accepted/deferred deltas below. Rebuilt under seed
`resonance-6e42` (plan `pl-2f9a` step 2): the prior build was a _different design_ (two
floating bordered cards); it is now one full-bleed conversation surface + the 80px app-nav.

Artifacts present: `design.png`, `app.png` (start state), `app-populated.png` (active turn),
plus `../05-profile-draft/app.png` (the generated draft, now woven inline in the same surface).

## Resolved (was drift → now matches)

| Aspect            | Design                                        | App now                                               | Verified        |
| ----------------- | --------------------------------------------- | ----------------------------------------------------- | --------------- |
| Composition       | one full-bleed panel                          | one full-bleed surface (no card chrome)               | ✅ visual       |
| Left app-nav      | 80px persistent rail                          | `AppNav` — 80px rail, right divider `#cdcdcd`         | ✅ px `#cdcdcd` |
| Assistant message | flowing prose                                 | prose, no bubble                                      | ✅ visual       |
| Start-state       | "Yes let's begin" / "I want do it later"      | bordered begin button + indigo "later" link           | ✅ visual       |
| Opener copy       | Figma prose + bold "Would you like to begin?" | exact copy, bold question                             | ✅ visual       |
| Composer          | two-row: `+` left · mic + send right          | two-row `WeaveComposer` (`+` / mic / send)            | ✅ visual       |
| Logo / collapse   | circular mark + collapse chevron              | spectrum ring mark + chevron (right)                  | ✅ visual       |
| Brand indigo      | `#6034ff` (link + accents)                    | link `#6034ff`, CTA `#6034ff`, Weave avatar `#6034ff` | ✅ px `#6034ff` |
| "Yes let's begin" | dark text on white, subtle border             | text `#2b2b2b`, border `gray-750`                     | ✅ px `#2b2b2b` |

No `#a855f7` (the old stock-purple primary) remains in the built screen.

## Accepted / deferred deltas

1. **Right 80px gray strip (accepted).** `design.png` shows a flat `#858585` gutter on the
   right edge. It is **not a node** — `metadata/mvp-flow-inventory.md` shows frame `1443:78282`
   has exactly two children: `Weave/Sidebar 1443:78283` (1432px) + `Navigation/SideBar
1443:78284` (80px) = 1512. The strip is the frame background showing where the 1432px surface
   component stops short of the 1512 edge. design.md specifies a **full-bleed** surface, so the
   app fills the width; the strip is a Figma component-sizing artifact, not chrome. **Not built.**
2. **Brand marks are token approximations (→ `resonance-cbbb`).** The header ring, the nav wave
   mark, and the two nav avatars are CSS/token stand-ins (spectrum ring, sine wave, gradient
   orbs) for the real Weave/Resonance SVG assets. Shapes differ slightly from the frame; the
   real-SVG import is `resonance-cbbb`.
3. **`+` / mic / collapse-chevron are inert placeholders (→ `resonance-216c`).** Rendered for
   visual parity (muted, matching the frame) but disabled — attach/voice/collapse are deferred.
4. **User-turn styling is unverified (→ `resonance-216c`).** The frame captures only the opening
   state; the active-turn user bubble (restrained right-aligned `surface-muted`) has no design
   frame to check against. Assistant prose matches the frame.
5. **Composer send-circle idle fill.** App `#cdcdcd` (`bg-border`) vs design `~#dfdfdf` — a
   ~1-step lighter gray; within tolerance for a disabled affordance.

## Provenance (R1)

- Component docstrings now cite `1443:78282` / `1443:78283` — both present in
  `metadata/mvp-flow-inventory.md`. The prior **fabricated** citation `1443:114245` (the 40px
  _collapsed_ rail on the Orders screen) is removed. Machine-checked Code Connect mapping is
  `resonance-cbbd`.
