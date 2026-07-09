# Create account — parity (screen 02)

**Verdict:** `app.png` **matches `design.png`** (Figma `1526:78839`), except the deltas below.
Reconciled under `resonance-c7c9` (plan `pl-2f9a` step 3).

## Resolved (was drift → now matches)

| Aspect        | Was (app)                          | Now                                            | Verified        |
| ------------- | ---------------------------------- | ---------------------------------------------- | --------------- |
| Chrome        | white card + border on gray page   | cardless centered column on white              | ✅ visual       |
| Logo          | `bg-brand-gradient` rounded square | `ResonanceMark` wave (spectrum)                | ✅ visual       |
| Legal terms   | plain text                         | Term of Use / Info Notice / Privacy underlined | ✅ visual       |
| Submit button | faded-indigo (opacity-50 disabled) | gray disabled — fill `#f2f2f2`, text `#a6a6a6` | ✅ px `#f2f2f2` |
| Button height | 48px (`wide` was h-12)             | 56px (`wide` → h-14, Figma Button/Wide)        | ✅ visual       |

## Accepted / deferred deltas

1. **Button label "Create account" vs design "Continue" (→ `resonance-dba0`).** The copy change
   is coupled to the E2E/capture assertions (`getByRole("button", { name: "Create account" })`),
   so it lands with dba0, not here.
2. **Wave mark shape (→ `resonance-cbbb`).** Token/SVG approximation of the real `Logo/Resonance`
   asset; the loop shape differs slightly.
3. **Legal terms are underlined spans, not links.** Real hrefs (Term of Use / Privacy / Notice
   pages) are deferred — the pages don't exist yet.
