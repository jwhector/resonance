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

- `design.png` — the Figma render. **This is the contract.**
- `design.md` — extracted spec: resolved hexes, spacing, type, plus a **provenance block**
  (`fileKey`, `nodeId`, `capturedAt`, `designPngSha256`, `provenance`).
- `app.png` — a screenshot of the running app (Playwright) at the matching route.
- `parity.md` — the delta list + verdict (see rules below).

`metadata/` holds node-inventory dumps — the source of truth for **which node ids actually
exist**. `_index.md` is the screen ↔ route ↔ component ↔ node-id map. `PROVENANCE.md` states
which Figma file the manifest currently trusts and what that citation is worth.

## Layout

```
design/manifest/
  README.md            # this protocol
  PROVENANCE.md        # which Figma file we trust, and why that is currently a problem
  _index.md            # screen ⇄ route ⇄ component ⇄ verified nodeId ⇄ status
  metadata/            # node-inventory dumps (proves node ids exist)
  screens/<nn-name>/   # design.png · design.md · app.png · parity.md
  components/<name>/    # same, for bespoke components / primitives
```

## Capture notes — how to actually get a `design.png` (read this first)

> **The REST path is dead. Do not start there.** `FIGMA_ACCESS_TOKEN` returns **`403`**, so
> every REST-backed tool fails: `figma_get_file_data`, `figma_get_file_versions`,
> `figma_get_file_at_version`, `download_assets`, `get_screenshot`, `get_metadata`. Earlier
> revisions of this file documented the REST funnel as the procedure; that guidance cost a
> subagent a stalled session. Verified `403` under `resonance-80bf`.
>
> **The only working path is the Figma Desktop Bridge plugin**:
> `mcp__figma-console__figma_execute` and `mcp__figma-console__figma_capture_screenshot`.

### Procedure

**0. Verify the bridge before anything else.** `figma_diagnose`, then `figma_get_status`
with `probe: true`. If the plugin is not connected, open it in Figma Desktop
(Plugins → Development → Figma Desktop Bridge) — or close and reopen it once — then
`figma_reconnect`. Confirm the reported `fileName` / `fileKey` is the file you mean to cite.

**1. Verify the node ids you intend to cite, in-session.**

```js
// figma_execute
const n = await figma.getNodeByIdAsync("1443:78153");
return { name: n.name, type: n.type, w: n.width, h: n.height };
```

Never cite an id you have not resolved this way (R1). A resolving id is not automatically the
right id — **check the node's `name`**, because ids survive a file copy while meaning does not
(see `PROVENANCE.md`).

**2. Export the PNG to disk.** `figma_capture_screenshot` renders an image into the
conversation for _looking at_ — it does **not** write a file. To get bytes onto disk, run a
tiny local HTTP receiver and `fetch` to it from the plugin sandbox:

- The plugin manifest's `networkAccess.allowedDomains` only permits **`http://localhost`
  ports 9223–9232**. Bind the receiver inside that range (9223 is the MCP server itself; 9232
  works) and use the hostname **`localhost`**, not `127.0.0.1`.
- Then, in `figma_execute`:

```js
const n = await figma.getNodeByIdAsync(NODE_ID);
const bytes = await n.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 1 } });
await fetch("http://localhost:9232/save?name=" + NAME, {
  method: "POST",
  body: figma.base64Encode(bytes),
});
```

Export at **`SCALE 1`** — existing screens are captured at native frame size (1512×982) and
the diff must compare like with like. Several frames can be exported in one `figma_execute`
call; batching is much faster than one call per frame.

**3. Extract the spec by walking the tree**, not with `get_design_context` (REST, dead). A
recursive walk reading `absoluteBoundingBox`, `fills`, `strokes`, `cornerRadius`,
`layoutMode`/`itemSpacing`/`padding*`, and for `TEXT` nodes `characters` + `fontName` +
`fontSize` + `lineHeight` gives everything a `design.md` needs.

**4. Hash the PNG and write the provenance block.**

```bash
shasum -a 256 design/manifest/screens/<nn-name>/design.png
```

Because REST is `403`, **Figma version ids are unobtainable and the content hash is the
substitute drift detector.** `exportAsync` at a fixed scale is byte-reproducible, so
re-exporting an unchanged frame reproduces the identical hash. Every `design.md` records:

```
fileKey:         <key>
nodeId:          <id>
capturedAt:      <ISO 8601 UTC>
capturedVia:     Desktop Bridge plugin — figma_execute + node.exportAsync({PNG, SCALE 1})
designPngSha256: <sha>
figmaVersionId:  UNAVAILABLE
provenance:      copy-derived | canonical
```

### Bridge gotchas

- **The connection drops constantly.** A successful `figma_execute` is frequently followed by
  `Unable to establish connection to Figma after 10 seconds` or `Connection replaced by same
file reconnection`. Call `figma_reconnect` and retry — it is not a real failure and it is
  not your code. Prefer few large calls over many small ones.
- **`getNodeByIdAsync` hangs on instance-internal ids** of the form `I<instance>;<child>`.
  Resolve the parent instance and walk its `children` instead.
- **`documentAccess: dynamic-page`** — synchronous accessors throw. Use `getNodeByIdAsync`,
  `getMainComponentAsync`, `loadAllPagesAsync`.
- **READ-ONLY.** `figma_execute` can mutate the document. Never call a Figma write tool
  against a design file — we do not own the canonical one, and writing to a copy just creates
  another divergent artifact.

App renders are captured with `apps/web/scripts/capture-app-manifest.mjs` under
`E2E_HARNESS=1`. Once a screen's `design.png` is committed, audits read the local files and
spend **zero** Figma calls.

## Rules (the anti-self-certification protocol)

- **R1 — Verified provenance.** Every Figma node id cited in code (docstring or
  `.figma.ts`) MUST appear in a saved `metadata/` dump, and the dump must name the `fileKey`
  it was read from. An id with no match is a **fabricated citation** → flag it; do not ship
  it as provenance. Cite only ids you resolved yourself in-session (see Capture notes).
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
