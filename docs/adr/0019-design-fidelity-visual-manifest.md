# ADR-0019: Design fidelity via the visual manifest — artifact-anchored parity (R1–R4)

- **Status:** Accepted
- **Date:** 2026-07-09

## Context

The reference slice's UI (ADR-0013) drifted **hard** from the Figma design while every
signal said it was done. The audit (`design/manifest/`) found the interview screen was
effectively a _different design_ (two floating bubble-cards vs. one full-bleed conversation
with an 80px app-nav), the `--color-primary` ramp shipped as stock Tailwind purple
`#a855f7` instead of the design's indigo `#6034ff`, and `weave-interview-rail` carried a
Figma node citation (`1443:114245`) for a frame that is actually the 40px collapsed rail on
a _different_ screen.

The root cause was **self-certification**: parity was asserted in **prose** — component
docstrings citing node ids, a mulch "design-fidelity pass" record — with **no artifact that
could confirm or refute it**. Under that regime, "provisional / not-yet-checked" silently
became "done," and three seeds (`resonance-8329`, `resonance-0c47`, `resonance-7d4f`) were
**closed asserting a parity that never happened**. A Figma MCP quota cap (the file sat in a
Starter-tier team; the quota is billed **per team, not per user**) compounded it by leaving
agents guessing at values and then laundering the guesses into "final."

Types are not validation (golden rule 4); by the same logic, a **claim of parity is not
parity**. We need parity to be a _diff of two images_, not a sentence you have to trust.

## Decision

Design fidelity is governed by a **local, human-inspectable visual manifest**
(`design/manifest/`) and four anti-self-certification rules. The full protocol lives in
[`design/manifest/README.md`](../../design/manifest/README.md); this ADR ratifies it.

1. **The Figma frame is the definitive source of truth.** Match it pixel-for-pixel; drive
   drift to zero; **read the frame, don't invent.** Where the design is definitive, an
   assumption may never stand in for it. "Conversation-first / no cards" and similar are a
   _lens_, not a rule — defer to the actual frame per screen, exceptions included.

2. **The manifest makes parity an artifact, per screen/component.** A directory holds
   `design.png` (the Figma render — **the contract**), `design.md` (extracted spec +
   verified `fileKey`/`nodeId`), `app.png` (the running app at the matching route), and
   `parity.md` (the delta list + verdict). `metadata/` holds the raw `get_metadata` dumps
   that prove which node ids exist; `_index.md` is the screen ⇄ route ⇄ component ⇄ node map.

3. **Four rules (the laundering guards):**
   - **R1 — Verified provenance.** Every Figma node id cited in code MUST appear in a saved
     `metadata/*` dump. An id with no match is a **fabricated citation** — flag it, don't
     ship it.
   - **R2 — Artifact-anchored parity.** Parity may only be stated as _"matches `design.png`
     except [explicit deltas]"_, with both `design.png` and `app.png` present. A bare
     "parity achieved" / "reconciled to Figma" is not a permitted claim.
   - **R3 — Provisional stays visible.** A value not yet cleared against a `design.png` is
     labeled `PROVISIONAL` in code and `status: provisional` in `_index.md`. It may not be
     relabeled "final/reconciled" until an artifact clears it.
   - **R4 — Adopt Code Connect.** The node↔component map is machine-checked at build (a
     wrong id fails to publish), replacing comment-asserted docstring citations.

4. **The loop enforces it, not vigilance.** Two levers make the protocol operative:
   - The **`add-ui-component-from-figma` recipe** is verify-mandatory: a component is not
     done until its `app.png` is captured and diffed against its `design.png` (visually
     **and** by pixel-sampling — perception is fooled by opacity/disabled states).
   - The project **`verify` skill** carries a UI branch: any change with a UI surface runs
     the capture → pixel-diff loop before it can be called verified. `apps/web/scripts/`
     provides the capture tooling (`capture-route <route> <out>` for a single route;
     `capture-app-manifest` for the whole slice), driven under the `E2E_HARNESS` seam
     (ADR-0018) so captures are deterministic.

5. **Spend the Figma budget once, cheap→expensive.** `get_metadata` → `get_screenshot` →
   `get_design_context` (verbose — only on the frame you are actively implementing). Never
   explore with the expensive tool. Audits thereafter read the local manifest and spend
   **zero** Figma calls.

Refines ADR-0012 (design system: shadcn + Figma tokens) and complements ADR-0018 (the
capture harness rides the same `E2E_HARNESS` seam). This is a **process/docs** decision — it
adds no package, service, or data flow, so the architecture diagram (ADR-0015) is unchanged.

## Consequences

- Parity is **inspectable and reviewable** — a reviewer diffs two images, and "provisional"
  can no longer masquerade as "done." The exact drift that shipped is now catchable at review.
- **UI changes carry a cost:** each built screen needs a `design.png` + `app.png` + a
  `parity.md` whose deltas are resolved or explicitly accepted; captures cost a little
  Figma budget and a harness run. Accepted — it is the price of "green means it matches."
- **Accepted deltas are legitimate and must be named.** A frame artifact (e.g. a fixed-width
  component leaving a gutter) or a deferred asset (real brand SVGs) is recorded in `parity.md`
  as an accepted/deferred delta, not silently reproduced or silently dropped.
- **Revisit trigger:** once Code Connect (R4) is adopted for the slice components
  (`resonance-cbbd`), docstring node-id citations become redundant and should be removed in
  favor of the machine-checked map.

## Alternatives considered

- **Prose assertions + discipline (status quo):** "cite the node id and say it's reconciled."
  This is exactly the failure mode — a green build actively undermines the vigilance it relies
  on. A local artifact is more reliable than a reminder.
- **Code Connect alone:** machine-checks _provenance_ (R1/R4) but not _pixel parity_ — a
  correctly-mapped component can still render wrong. Necessary, not sufficient; R2 is the
  pixel anchor.
- **App-vs-app visual regression (Chromatic/Playwright snapshots):** catches _regressions
  against a previous app state_, but the previous state here was itself wrong. The
  `design.png` anchor is what ties the check to the design instead of to yesterday's app.
