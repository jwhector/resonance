# ProfileGen draft — parity (screen 05)

**Verdict:** `app.png` **matches `design.png`** (Figma `1473:81622`), except the deltas below.
Reconciled under `resonance-c7c9` (plan `pl-2f9a` step 3); the draft is now woven inline in the
Weave surface built in `resonance-6e42`.

## Resolved / matches

| Aspect           | Design                                              | App                                             | Verified        |
| ---------------- | --------------------------------------------------- | ----------------------------------------------- | --------------- |
| Composition      | draft woven inline on the full-bleed Weave surface  | nav + Weave header + inline draft + composer    | ✅ visual       |
| Composer         | active "Talk to Weave" at the bottom                | rail composer shown (was a disabled inline one) | ✅ visual       |
| Draft leads      | intro + sections at top (prior chat scrolled away)  | transcript suppressed in draft; intro leads     | ✅ visual       |
| Section headings | Heading/L 28px bold                                 | `text-heading-lg font-bold`                     | ✅ visual       |
| Selected radio   | indigo `#6034ff` + dark text; others muted          | `#6034ff` selected, `text-muted` inactive       | ✅ px `#6034ff` |
| Composer fill    | `#f2f2f2` (gray-800)                                | `bg-surface-muted` `#f2f2f2`                    | ✅ px `#f2f2f2` |
| Buttons          | "Good to go" (primary) + "Revise with Weave" (link) | present; Revise disabled (deferred)             | ✅ visual       |

## Accepted / deferred deltas

1. **"Add tag" pill (→ `resonance-216c`).** The design's primary-outlined `+ Add tag` pill needs
   product input on the add-tag interaction; not built.
2. **Section headings use `--gray-300` (`#2b2b2b`), design uses literal `#1e1e1e`.** Per the
   `_index.md` cross-cutting "literal hexes vs tokens" decision, headings normalize to the token —
   an accepted ~1-step darkness delta.
3. **Dim overlay not built.** `design.png` shows the frame behind a 60%-black dim (`1382:33554`) —
   the "Weave drawer open" comp state, not the panel itself (per `design.md`). Correctly omitted.
4. **Copy is generated placeholder** (fake-model output differs from the frame's "Moonroot Studio"
   sample) — bound to real ProfileGen output, not a design delta.
5. **Composer during draft is live but sends into the (suppressed) transcript**; the true
   "Revise with Weave" refine loop is deferred (`resonance-216c`).
