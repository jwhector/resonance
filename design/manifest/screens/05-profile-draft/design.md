# ProfileGen draft — design spec

- Figma node: `1473:81622` — "Onboarding/Creator/Interview/Generated"
- Frame size: full-bleed 1512-wide canvas; 79px left nav rail + Weave chat panel `w-[1350px]` at `left-[82px]`; content column max ~1270px
- Code status: built as `profile-draft-panels.tsx`, citation valid

## Copy

Weave chat intro (node `1485:49370`):

- "Here are a few creator directions based on everything you shared."
- "Nothing here needs to be final — this is simply a first version you can refine and grow over time."

Creator Name section (`1486:49532`), section heading "Creator Name" (`1486:49531`). Three radio options (name + description):

- ACTIVE/selected — "Moonroot Studio" — "Reflective herbal and dream-centered experiences grounded in slowness, nighttime atmosphere, and inner connection." (radio node `1486:49505`)
- "Isithunywa" — "Plant-based dreamwork and intentional spaces for reflection, restoration, and grounded healing." (`1486:49512`)
- "Night Bloom Collective" — "Quiet herbal gatherings and reflective experiences for people seeking slower and more intentional rhythms." (`1486:49524`)

Headline section (`1485:49421`), heading "Headline" (`1485:49422`):

- Field value: "Dreamwork and herbal reflection for slower inner connection." (`1485:49423`)

About section (`1485:49374`), heading "About" (`1485:49375`), field value (`1485:49376`):

- "[Creator Name] Explores dreamwork, herbal blends, and reflective sessions designed to help people slow down, reconnect with themselves, and listen more closely to their inner rhythm."
- "Rooted in personal experiences with disconnection, dreaming, and plant-based reflection, the work creates quiet and supportive spaces for people seeking grounded and intuitive ways of healing."

Search Keywords section (`1485:49377`), heading "Search Keywords" (`1485:49378`), tag group (`1485:49379`):

- Tags (removable, with X icon): "Dreamwork", "Herbal Reflection", "Reflective Sessions", "Night Rituals"
- "Add tag" pill (primary-outlined, + icon) — node `1409:46361`

Button group (`1485:49385`):

- Primary button "Good to go" (`1485:49386`)
- Text/link button "Revise with Weave" (`1485:49387`)

Weave composer (bottom, `434:1194`): placeholder "Talk to Weave"; Add icon (`439:1186`), Mic icon (`439:1184`), Arrow-circle-up send icon (`1637:83641`).
Weave topbar: "Weave" wordmark (`1485:49291`) with Weave symbol + dropdown chevron.
Left nav rail (`1878:42488`): Resonance symbol, Home icon, box-checkmark icon, Calendar icon, two profile avatars.

## Tokens / type

Colors (resolved hex → token):

- Page / panel background: `#ffffff` → `--gray-900`
- Composer + heading-text field fill: `#f2f2f2` → `--gray-800`
- Borders (inputs, composer, dividers): `#cdcdcd` → `--gray-700`
- Primary text, active radio text, tag text/border, section subheads: `#2b2b2b` → `--gray-300`
- Muted text (inactive radio, "Talk to Weave" placeholder): `#a6a6a6` → `--gray-600`
- Primary accent (active radio, "Add tag" border/text, "Good to go" fill, "Revise with Weave" text): `#6034ff` → `--primary`
- "Good to go" button label: `#ffffff` → `--gray-900`
- Section headings (Headline/About/Search Keywords) use literal `#1e1e1e` (near-black, NOT `--gray-300`); input body text uses literal `text-black` (`#000`)
- Dim overlay: `--gray-0` (black) at 60% opacity, layer opacity 80%

Type (family "Helvetica Neue"):

- Heading/L (section titles "Creator Name", "Headline", "About", "Search Keywords"): Bold 700, 28px, line-height 36px
- Heading/M (radio option name, "Weave" wordmark): Medium 500, 22px, line-height 30px
- Body/L (descriptions, field values, chat text, placeholder): Regular 400, 16px, line-height 24px
- Button ("Good to go", "Revise with Weave"): Medium 500, 16px, line-height 24px
- Caption (tag labels): Medium 500, 12px, line-height 18px

## Layout

- Radio row: flex, `gap-[16px]`, `items-start`; 24px radio button + text column `w-[600px]` with `gap-[8px]`
- Text input fields: `bg-[--gray-900]` white, 1px `--gray-700` border, `p-[16px]`, `rounded-[8px]`, `min-w-[500px] max-w-[1230px]`, full-width
- Tags: `border-2` (2px), radius 8px, `p-[12px]`, `gap-[4px]`; added tag = `--gray-300` border, "Add tag" = `--primary` border. Icon 12px.
- Tag group: flex row, `gap-[16px]`, `items-center`
- Section stacks: `gap-[24px]` (Creator Name, Headline, About) or `gap-[20px]` (Search Keywords)
- Chat/response column: `gap-[24px]`, scrolls (`overflow-y-auto`), inset with `pt-[40px] px-[40px]`
- "Good to go" button: fill `--primary`, height 52px, `w-[148px]`, `px-[24px] py-[16px]`, radius 8px
- Composer (Input/Wide): `w-[1270px]`, fill `--gray-800`, 1px `--gray-700` border, `p-[16px]`, radius 8px; inner "BottomBar" row space-between with Add on left, Mic + send on right
- Left nav rail: `w-[79px]`, `px-[13px] pt-[24px]`, icon group `gap-[24px]`, vertical divider 1px `--gray-700` on right edge

## Parity notes

- The screen is shown behind a **Dim overlay** (`1382:33554`, black 60% × 80% layer opacity) — this is the "Weave sidebar" modal-over state. The dim is a presentational overlay for the Figma comp, not part of the panel itself; the built `profile-draft-panels.tsx` should render the panels without the dim unless it is intentionally the Weave-drawer-open state.
- Section headings use literal `#1e1e1e` and field body text uses literal `text-black`/`#000` rather than the `--gray-300` (`#2b2b2b`) token used elsewhere for headings. Confirm whether the build normalizes these to `--gray-300` or preserves the darker literals — a token/parity decision worth flagging.
- Creator Name options are a single-select radio group with the first ("Moonroot Studio") pre-selected/active; ensure selected-state styling (dark text + filled radio) vs inactive (muted `--gray-600` text) is modeled.
- All copy (names, headline, about, keywords) is generated placeholder content — the panels must bind to real ProfileGen output, and About contains a literal "[Creator Name]" merge token.
