# Onboarded (published creator profile) — design spec

- Figma node: `1443:78273` — "Onboarding/Creator/Onboarded"
- Frame size: full canvas ~1512-wide, 1596px tall; 79px nav rail (left), 333px Weave sidebar at `left-[82px]`, main profile column `w-[1392px]` at `left-[120px]`
- Code status: orphan-design (NOT built) — no corresponding component yet

## Copy

Profile hero (`CreatorProfileOnboarding`, `1284:11974`):

- Top-right cart button (`1375:32354`)
- Top-left button group (`1410:42659`): "Share" (outlined, share icon, `1410:42654`) + "Publish" (white fill, `1410:42521`)
- Creator name (display): "Lumen Herb Lab" (`479:1833`)
- Tagline: "Herbal healing experiences for rest, reconnection, and intentional living." (`479:1836`)
- Tag pills (white-outlined): "Herbal Healing", "Herbal Tinctures", "Tea Blends", "Dreamwork" (`479:1838`)
- Action group (`1410:43996`): "Edit Profile" button (white fill, `1410:43798`) + "0 Follower" text (`1284:11938`)

Profile tabs section (`CreatorProfileTabs`, `1289:12378`):

- Tabs (`TabsMain`, `1284:12115`): "Offerings", "Receivings", "Following" (inactive, muted) + "About" (ACTIVE, underlined) — active tab node `434:1250`
- About body (`I1289:12350;439:1485`):
  - "Lumen Herb Lab creates small-batch herbal tinctures, tea blends, and seasonal experiences designed to support nervous system healing, dreamwork, and deeper connection with the body."
  - "Rooted in personal healing journeys and nature-connected practices, the work blends grounded herbalism with reflective living — helping people slow down, reconnect, and build healthier rhythms with themselves and the world around them."
- "Contact" subhead (`I1289:12350;439:1487`) + "Add Contact" outlined button with + icon (`I1289:12350;450:1545`)

Weave sidebar (`1443:78281`):

- Topbar: "Weave" wordmark (`LogoWeave`/`454:1786`) + dropdown chevron + close (X) icon (`I1443:78281;454:1793`)
- WeaveResponse/Narrow (`I1443:78281;1403:59113`): "Your profile is now live on Resonance." / (blank line) / "I applied the story, atmosphere, and language you shared to build your first creator presence." / (blank line) / "From here, I can also help you:"
- Suggestion buttons (wide, outlined) (`I1443:78281;1403:59091`): "Create visual asset", "Shape offering", "Refine your profile"
- Composer (`Input`, `454:1833`): placeholder "Talk to Weave"; Add, Mic, Arrow-circle-up send icons

Left nav rail (`1443:78280`): Resonance symbol, Home, box-checkmark, Calendar, two profile avatars.
NOTE: there is also a stray/orphan "Contact" label (`1443:78274`) + square add button (`1443:78275`) positioned far down at `top-[1438px]`/`top-[1505px]` — appears to be leftover artboard scaffolding outside the main flow.

## Tokens / type

Colors (resolved hex → token):

- Page / card / white-button background: `#ffffff` → `--gray-900`
- Hero background: `#6034ff` → `--primary` (solid primary fill placeholder for `BackgroundImg/Default`)
- Composer fill: `#f2f2f2` → `--gray-800`
- Borders (suggestion buttons 2px, "Add Contact", dividers, composer): `#cdcdcd` → `--gray-700`
- Primary/dark text ("Publish", "Edit Profile", suggestion labels): `#2b2b2b` → `--gray-300`
- Weave wordmark + "About"/"Contact" subheads + active tab: `#0a0a0a` → `--gray-50`
- Muted text (inactive tabs, "Talk to Weave" placeholder): `#a6a6a6` → `--gray-600`
- "0 Follower" text: `#cdcdcd` → `--gray-700`
- Hero name/tagline/tag text, cart/edit button fills: white `--gray-900` (on primary hero)
- Weave intro body text: literal `#1e1e1e` (NOT `--gray-300`)
- About body text: literal `text-black` (`#000`)
- Close-icon strokes: `#2e2e2e` → `--neutral-800`
- Stray square button: fill `--gray-800`, `border-2` `#868686` → `--gray-500`

Type (family "Helvetica Neue"):

- Display/M (creator name "Lumen Herb Lab"): Bold 700, 40px, line-height 48px
- Heading/M (tab labels, "About"/"Contact" subheads, "Weave" wordmark): Medium 500, 22px, line-height 30px
- Body/L (tagline, About body, Weave intro, composer placeholder): Regular 400, 16px, line-height 24px
- Button (Share/Publish/Edit Profile/Add Contact/suggestion labels): Medium 500, 16px, line-height 24px
- Caption (tag pills): Medium 500, 12px, line-height 18px

## Layout

- Overall: 3 columns — 79px nav rail + 1px divider · 333px Weave sidebar (`left-[82px]`) · 1392px main profile (`left-[120px]`, clickable link wrapper `1443:78277`, height 1596px)
- Hero (`1284:11974`): 1392×800, primary-color background; content block at `left-[88px] top-[229px] w-[654px]`, vertical `gap-[24px]`; 80px square profile image; tag group flex `gap-[16px]`
- Buttons: white fill buttons height 56px, `px-[24px] py-[16px]`, radius 8px; outlined buttons `border-2`, radius 8px
- Tag pills: `border-2`, `p-[12px]`, radius 8px
- Tabs section (`1289:12378`): 1392×796 below hero (`top-[800px]`); content at `left-[80px] top-[40px] w-[558px]`, `gap-[30px]`; tabs row `gap-[40px]`; active tab has 2px `--gray-50` underline; About column `w-[538px]`, `gap-[40px]`; 160px square profile image
- Weave sidebar (`1443:78281`): 333px wide; topbar height 75px, `p-[24px]`, `rounded-tr-[16px]`, bottom divider 1px `--gray-700`; response block inset with `gap-[24px]`; suggestion button group `gap-[12px]`, each button height 56px, full-width, `border-2` `--gray-700`, radius 8px (heavy `px-[236px]` is centering artifact — treat as centered full-width); composer 253×96 near bottom
- Nav rail: `w-[79px]`, `px-[13px] pt-[24px]`, icon stack `gap-[24px]`, right divider 1px `--gray-700`

## Parity notes

- ORPHAN — not built. When implemented, this is the post-onboarding "published profile + Weave next-steps" screen; it composes the shared nav rail + Weave sidebar (same as ProfileGen draft) with a new creator-profile hero + tabbed profile body.
- Hero background is a flat `--primary` (#6034ff) fill standing in for a real `BackgroundImg` (visual asset) — the build should treat it as an image slot with a primary fallback, not a hardcoded purple.
- Two competing text-color conventions again: Weave intro uses literal `#1e1e1e`, About body uses `text-black`/`#000`, while headings use `--gray-50` (#0a0a0a) and buttons use `--gray-300` (#2b2b2b). Reconcile to tokens when building.
- The "Weave" wordmark here maps to `--gray-50` (#0a0a0a), whereas on the ProfileGen draft screen the same wordmark maps to `--gray-300` (#2b2b2b) — inconsistent token usage across screens; pick one.
- Stray "Contact" label (`1443:78274`) + square add button (`1443:78275`) sit at y≈1438–1505 outside the main link region — likely detached design scaffolding; do NOT build these, confirm with design.
- Suggestion buttons ("Create visual asset", "Shape offering", "Refine your profile") imply downstream Weave flows (visual-asset gen, offering shaping, profile refinement) that are not yet built.
