# Interview — design spec

- **Figma:** `UYlkCL7jkCVgKWiqAVlEFp` node `1443:78282` (Onboarding/Creator/Interview), 1512×982
- **Structure:** `Navigation/SideBar` `1443:78284` (80px left app-nav) + `Weave/Sidebar` `1443:78283` (**1432px — full-bleed**, the conversation surface)
- **Captured:** `download_assets` (design.png) + `get_metadata` (structure, pre-restart)
- **Code status:** 🔴 built as `weave-interview-rail.tsx` + `weave-composer.tsx` — **wrong interaction model**.

## Copy

- Header: circular Weave logo + **"Weave"** wordmark + a **collapse chevron** (top-right).
- Assistant opening (flowing prose, not a bubble): _"Hi — I'm glad you're here. I'll help you shape a clear version of your creator presence by learning a little about your work, your story, and the people who naturally resonate with it. As we go, I'll also explain why certain questions matter so the process feels collaborative and transparent. This usually takes about 5–10 minutes, and you don't need to have everything perfectly figured out._ **Would you like to begin?**"
- Start-state controls: **"Yes let's begin"** (bordered button) + **"I want do it later"** (primary text link).
- Composer: full-width field **"Talk to Weave"**, with **`+`** (left) and **mic + send** (right).

## Tokens / type

- Brand primary: indigo **`#6034ff`** (the start-link + accents) — NOT the app's `#a855f7`.
- Left nav: 80px persistent rail (home / orders / calendar icons + avatars + wave mark).
- Conversation surface: full-bleed, no card border (only a subtle divider from the nav).

## Parity deltas (vs `weave-interview-rail` + `weave-composer`)

| Aspect            | Design                            | App                                |
| ----------------- | --------------------------------- | ---------------------------------- |
| Composition       | one full-bleed panel              | two floating bordered cards        |
| Assistant message | flowing prose                     | gray chat bubble                   |
| Start-state       | "Yes let's begin" / "do it later" | none                               |
| Generate          | inline in conversation            | separate "Ready when you are" card |
| Logo / collapse   | circular + chevron                | rounded-square, no chevron         |
| Composer          | `+` · mic · send                  | send-only                          |
| Left app-nav      | 80px rail present                 | absent                             |
| Brand             | `#6034ff`                         | `#a855f7`                          |

Citation defect: docstring cites `1443:114245` as "Weave/Sidebar" — that's the **40px collapsed** variant on the **Orders** screen. Real interview surface is `1443:78283`.
