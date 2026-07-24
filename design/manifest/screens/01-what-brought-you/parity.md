# What brought you? — parity (screen 01)

**Verdict:** `app.png` **matches `design.png`** (Figma `1519:78312`), except the deltas below.
Built under `resonance-c2d2` (bcd9 triage). Route `/start`, component
`@resonance/ui` → `IntentPickerCard`, wired by `apps/web/app/(onboarding)/start`.

## Matches (design contract → app)

| Aspect       | design.png                                            | app.png                                                   | Verified        |
| ------------ | ----------------------------------------------------- | --------------------------------------------------------- | --------------- |
| Chrome       | cardless centered column on white                     | `(onboarding)` layout `bg-surface`, `max-w-lg` column     | ✅ visual       |
| Heading      | "What brought you to here today?" · Heading/M         | `text-heading-md font-medium text-foreground`             | ✅ visual       |
| Options      | 3 full-width bordered boxes, single-select (no dot)   | Radix `RadioGroup` boxes, `border-2 border-border-strong` | ✅ visual       |
| Option text  | Body/L `#2b2b2b`                                      | `text-body-lg text-foreground`                            | ✅ visual       |
| Next button  | gray fill `#f2f2f2`, muted text `#a6a6a6`, 56px, wide | `Button size="wide"` disabled treatment (pre-selection)   | ✅ px `#f2f2f2` |
| Copy + order | explore / share / business                            | `INTENT_OPTIONS` — same three strings, same order         | ✅ visual       |

## Accepted / deferred deltas

1. **Wave mark shape (→ `resonance-cbbb`).** Renders the placeholder `ResonanceMark`
   (sine wave, `bg-brand-gradient`) rather than the final `Logo/Resonance` SVG — identical
   to every other onboarding screen (02/03), so the app is internally consistent. Swapped
   repo-wide when the real wordmark/Weave assets land.
2. **Option-box border weight is `border-2` per `design.md`'s extracted spec.** Reads
   marginally heavier than the `design.png` render; kept to the documented Figma stroke.
   Confirm against the frame if a fidelity pass revisits this screen.

## Behavior (not visible in a static frame)

- The intent fork is a **routing** decision owned by the app shell, not the component:
  `share` + `business` → `/signup` (creator interview flow); `explore` → `/` (scaffold home
  placeholder until member discovery exists). Covered by `intent-form.test.tsx`.
