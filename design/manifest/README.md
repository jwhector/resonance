# Design Manifest & Figma Parity Protocol

Ground truth for the UI, checked into the repo. This exists because parity against
Figma was previously **asserted in prose** (component docstrings citing node ids, a
mulch "design-fidelity pass" record) with no artifact that could confirm or refute it.
Under that regime "provisional / not-yet-checked" silently became "done" — e.g. the
brand `--color-primary` shipped as stock Tailwind purple (`#a855f7`) while the design
system's primary is `#6034ff`, and `weave-interview-rail` carried a Figma node citation
for a frame nobody had verified exists.

The fix: make the design a **local, human-inspectable artifact** so parity is a _diff of
two images_, never a claim you have to trust.

## What the manifest is

For each screen and bespoke component, a directory holding:

- `design.png` — the Figma render (`get_screenshot`). **This is the contract.**
- `design.md` — extracted spec (`get_design_context`): resolved hexes, spacing, type,
  and the **verified** Figma `fileKey` + `nodeId`.
- `app.png` — a screenshot of the running app (Playwright) at the matching route.
- `parity.md` — the delta list + verdict (see rules below).

`metadata/` holds the raw `get_metadata` XML dumps — the source of truth for **which
node ids actually exist**. `_index.md` is the screen ↔ route ↔ component ↔ node-id map.

## Layout

```
design/manifest/
  README.md            # this protocol
  _index.md            # screen ⇄ route ⇄ component ⇄ verified nodeId ⇄ status
  metadata/            # raw get_metadata XML (proves node ids exist)
  screens/<nn-name>/   # design.png · design.md · app.png · parity.md
  components/<name>/    # same, for bespoke components / primitives
```

## The Figma budget funnel (200 calls/day/seat — treat as scarce)

Go cheap → expensive, and **never invert it**. The prior exhaustion came from using the
expensive tool to explore.

1. `get_metadata(fileKey)` — no nodeId → lists pages. 1 call maps the file.
2. `get_metadata(fileKey, node)` — the frame tree for a page/screen. Cheap; structural.
3. `get_screenshot(fileKey, node)` — returns a **downloadable URL**; `curl` the PNG into
   this dir. One call = full visual truth for a screen.
4. `get_design_context(fileKey, node)` — verbose. Only on the frame you are actively
   auditing/implementing. **Do not explore with this tool.**

Use the higher-budget team copy `UYlkCL7jkCVgKWiqAVlEFp` (same node ids as the primary
`7FOYLdtzCTITjcPeGKwF31` — Figma copies preserve ids). Spend the budget **once** to build
this manifest; audits thereafter read the local files and spend **zero** Figma calls.

## Rules (the anti-self-certification protocol)

- **R1 — Verified provenance.** Every Figma node id cited in code (docstring or
  `.figma.ts`) MUST appear in a saved `metadata/*.xml` dump. An id with no match is a
  **fabricated citation** → flag it; do not ship it as provenance.
- **R2 — Artifact-anchored parity.** Parity is only ever stated as _"matches
  `design.png` except [explicit deltas]"_, with both `design.png` and `app.png` present
  in the dir. A bare "parity achieved" / "reconciled to Figma" is not a permitted claim.
- **R3 — Provisional stays visible.** A token or value not yet cleared against a
  `design.png` is labeled `PROVISIONAL` in code and `status: provisional` in `_index.md`.
  It may not be relabeled "final/reconciled" until an artifact clears it. This is the
  laundering guard.
- **R4 — Adopt Code Connect** so the node↔component map is machine-checked at build, not
  comment-asserted (a wrong id fails to publish). Replaces the docstring citations.

## Running an audit (two levels — they catch different bugs)

1. **Structural / inventory** — every design screen maps to a code screen and vice
   versa; orphans on either side are flagged. _This is the level that catches an
   invented component (a rail with no design frame) or a missing screen._
2. **Pixel / token** — `app.png` vs `design.png` side by side + a delta list of concrete
   diffs (this hex, this spacing, this missing/extra element). Adjudicated visually.

## Status legend (`_index.md`)

`verified` — design.png + app.png present, deltas resolved · `deltas` — audited,
open diffs listed in parity.md · `provisional` — built on unverified tokens, not yet
checked · `orphan-code` — component exists in code, no design frame · `orphan-design`
— design frame exists, not built.
