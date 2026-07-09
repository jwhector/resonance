# Create account — design spec

- **Figma:** `UYlkCL7jkCVgKWiqAVlEFp` node `1526:78839` (Onboarding/Creator/CreateAccount), 1512×982, bg white (`--gray-900 #fff`)
- **Captured:** `get_design_context` + `download_assets` (design.png)
- **Code status:** built — `create-account-card.tsx`; citation `1526:78839` **valid**.

## Copy

- Wave logo mark (Logo/Resonance, 80×24), centered column (width 500, gap 40).
- Heading: **"Welcome to Resonance"** · subtitle: **"Create your account with email"**
- Email input, placeholder **"Type your email"**
- Consent checkbox + text: **"I agree Resonance's Term of Use, and acknowledge its Information Collection Notice and Privacy Policy"** (Term of Use / Information Collection Notice / Privacy Policy underlined)
- Wide button: **"Continue"**

## Tokens / type

- Heading — Heading/M: Helvetica Neue Medium 22 / lh 30, `--gray-300 #2b2b2b`
- Subtitle / body — Body/L: Helvetica Neue Regular 16 / lh 24, `--gray-600 #a6a6a6`
- Input: white bg, border `--gray-700 #cdcdcd`, rounded-8, padding 16; placeholder `--gray-600 #a6a6a6`
- Button/Wide: `--gray-800 #f2f2f2` bg, text `--gray-600 #a6a6a6`, height 56, rounded-8

## Parity deltas (vs app)

- **Button label:** design **"Continue"** vs app **"Create account"** → seed `resonance-dba0`.
- Confirm subtitle + consent copy match the app (`create-account-card`).
