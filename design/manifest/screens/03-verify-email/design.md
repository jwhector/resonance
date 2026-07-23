# Verify email (OTP) — design spec

- Figma node: `1526:79050` — "Onboarding/Creator/CreateAccount/EmailVerication"
- Frame size: content column `w-[400px]`, positioned `left-[calc(33.33%+52px)] top-[319px]`
- Code status: built as `email-verify-card.tsx`, citation valid

## Copy

- Icon: Mail (fluent envelope icon), 32×32 — node `1526:79082`
- Heading: "Check your email to continue" — node `1526:79084`
- Body (two lines): "We've sent an email to jimchoi@gmail.com." / "Click the magic link or enter the code below:" — node `1526:79085` (email address is placeholder data, interpolate real address)
- OTP: 6 single-digit input boxes — list node `1401:38551`, each box node `1400:58151`
- Primary button: "Continue" (disabled/inactive styling) — node `1526:79078`
- Footer prompt: "Didn't get the email?" — node `1526:79089`
- Footer action: "Try again" (link) — node `1526:79090`

## Tokens / type

Colors (resolved hex → token):

- Page background: `#ffffff` → `--gray-900`
- Heading text: `#2b2b2b` → `--gray-300`
- Body / secondary / disabled-button text / footer text: `#a6a6a6` → `--gray-600`
- OTP input border: `#cdcdcd` → `--gray-700`
- Disabled "Continue" button fill: `#f2f2f2` → `--gray-800`
- "Try again" link text: `#6034ff` → `--primary`

Type (family "Helvetica Neue"):

- Heading (Heading/M): Medium 500, 22px, line-height 30px
- Body (Body/L): Regular 400, 16px, line-height 24px
- Button / link / footer (Button): Medium 500, 16px, line-height 24px; footer prompt is Regular 400, 16px/24px

## Layout

- Outer content column: flex column, `gap-[37px]`, `items-center`, width 400px
- Header group (icon + text): flex column, `gap-[16px]`, centered; text sub-group `gap-[8px]`, text-center
- OTP row (`InputList`): flex row, `gap-[8px]`, `items-center`, `cursor-pointer`; 6 boxes each 36×40 (`w-[36px] h-[40px]`), border 1px `--gray-700`, radius 8px
- Footer group: flex column, `gap-[16px]`, centered
  - Continue button (Button/Wide): height 56px, full 400px width, `rounded-[8px]`, padding `px-[236px] py-[16px]`, fill `--gray-800`, centered label. The heavy horizontal padding is an artifact of centering a nowrap label in a fixed-width button; treat as center-aligned full-width button.
  - "Didn't get the email? / Try again" row: flex row, `gap-[8px]`, `items-center`

## Parity notes

- The "Continue" button here is rendered in its **disabled/inactive** state: `--gray-800` fill with `--gray-600` label (not the active `--primary` fill). Enabled state must swap to the primary treatment; confirm `email-verify-card.tsx` models both states.
- Email address `jimchoi@gmail.com` is placeholder text — must be interpolated from the actual pending sign-up email.
- OTP boxes are 6 digits, 36×40 each, 8px gap — verify the built input count and per-box dimensions match.
