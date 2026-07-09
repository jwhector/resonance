---
name: verify
description: Verify a change actually works in Resonance — exercise the affected flow, not just tests. For any change with a UI surface, pixel-diff the running app against design/manifest (design.png ⇄ app.png, ADR-0019). Runs inside /feature and before shipping a chunk.
---

# Verify a change (Resonance)

A change is not verified because typecheck/lint/tests pass — those check that code is
_consistent_, not that it _does the thing_. Verify by **observing the behavior**: drive the
affected flow in the real app and confirm the outcome. Then, and only then, call it verified.

## 1. Run the gate (necessary, not sufficient)

Turbo-scoped to the affected packages — the same gate CI + the no-mistakes push gate run:

```bash
pnpm typecheck && pnpm lint && pnpm test
```

## 2. Exercise the flow

Pick the branch that matches what changed:

### UI change → **pixel-diff against the manifest (MANDATORY, ADR-0019)**

Any change with a visible surface — a `@resonance/ui` component, a screen, layout, or token —
is verified against its Figma frame, because **parity is a diff of two images, not a claim**
(golden rule 10). Perception lies (opacity, disabled tints, near-grays), so sample bytes too.

1. **Run the app under the harness:** `E2E_HARNESS=1 pnpm --dir apps/web dev` (real Neon DB via
   `apps/web/.env.local`; fakes model/mail/embedder). Usually already on `:3001`.
2. **Capture the route.** Single screen:
   `SERVER_LOG=<dev-log> node apps/web/scripts/capture-route.mjs <route> design/manifest/screens/<nn>/app.png`.
   Whole slice: `node apps/web/scripts/capture-app-manifest.mjs`. Warm-retry once if the first
   authed nav times out (Next cold-recompiles — `curl -s <route> -o /dev/null`, then re-run).
3. **Diff `app.png` vs `design.png`** — the frame is the contract (`design/manifest/README.md`).
   Look side-by-side, then confirm the hexes/spacing you doubt by pixel-sampling:
   ```bash
   node -e "const s=require(require.resolve('sharp',{paths:['apps/web']}));\
   s('<png>').extract({left:X,top:Y,width:1,height:1}).raw().toBuffer().then(b=>console.log(b[0],b[1],b[2]))"
   ```
4. **Iterate to zero drift**, then write/update the screen's `parity.md`: _"matches `design.png`
   except [deltas]"_, every delta **resolved or explicitly accepted** (a frame artifact or a
   deferred asset is named — never silently reproduced or dropped). Update `_index.md` status.
   A bare "reconciled to Figma" is not a permitted claim (R2).

### Server Action / route / domain logic → drive it

Run the route or action end-to-end (the onboarding flow, a Server Action) and confirm the
real effect (a DB row, a redirect, a rendered result) — not just a unit test double.

### External wiring (model / embedding / mail / DB) → live-smoke

`pnpm verify:live` (ADR-0018) exercises each external service for real. It **skips** (exit 0)
without credentials, so it's safe to run; a green live-smoke is what makes "it works live" true.

## 3. Report honestly

State what you drove and what you observed. If a step was skipped or a delta accepted, say so
(and where it's recorded). Don't report "verified" from tests alone.

## Reference

- [design/manifest/README.md](../../../design/manifest/README.md) — the R1–R4 protocol + budget funnel
- [ADR-0019](../../../docs/adr/0019-design-fidelity-visual-manifest.md) — design fidelity via the visual manifest
- [add-ui-component-from-figma](../add-ui-component-from-figma/SKILL.md) — building the component (Step 8 = this loop)
