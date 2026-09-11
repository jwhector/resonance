# Provenance — which Figma file this manifest actually trusts

> **Short version.** The manifest trusts a **dated snapshot** of the designer's file,
> delivered as a copy and registered here. The current trusted snapshot is
> **`A33kUDiRAatoMDx3L1m2Y4` — `Resonance 9/10/26`**, taken 2026-09-10. REST is still
> `403`, so captures are pinned by **SHA-256 of `design.png`** plus the snapshot date,
> not by a Figma version id. Screens captured from earlier copies keep their
> `copy-derived` flag until re-verified against the current snapshot.

## The snapshot model

We cannot read the designer's live file: the workflow needs the Desktop Bridge plugin
(REST is dead, see below), and the live file sits in a Starter-tier team whose REST
budget cap is what pushed us onto copies in the first place. So the working arrangement
is explicit **dated snapshot handoffs**:

1. A snapshot of the designer's file is taken and named with its date
   (e.g. `Resonance 9/10/26`).
2. That snapshot is registered here as **the trusted source**. All new captures cite its
   `fileKey` and record `snapshotDate` in their provenance block.
3. The snapshot is **frozen**: zero drift on day one, accumulating drift thereafter. The
   refresh mechanism is a **new snapshot** — register the new key, re-verify hashes,
   re-capture what changed.
4. Reads happen through the Desktop Bridge plugin (`figma_execute` + `exportAsync`),
   which is local and consumes **zero REST quota**. Rate limits do not apply to capture.

This trades "always current" (which we never actually had) for "honestly dated": a
citation says _what the design was on the snapshot date_, and the registry below says
how stale that is.

## The file keys in play

| fileKey                  | Name                    | Role                                                                                              |
| ------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------- |
| `A33kUDiRAatoMDx3L1m2Y4` | **`Resonance 9/10/26`** | **Trusted snapshot (2026-09-10).** The source for all new captures.                               |
| `vC0O5uyMmw1o5vYHmCoOXq` | `Resonance (Copy)`      | **Cache.** Historical source of screens 08–13 (captured 2026-07-26/29). Do not cite for new work. |
| `UYlkCL7jkCVgKWiqAVlEFp` | Pro-team copy           | Historical source of screens 01–05 and 07; screen 06 has been re-verified. Do not cite for new work. |
| `7FOYLdtzCTITjcPeGKwF31` | original                | The designer's live team file lineage (Starter-tier, REST budget-capped, `mx-29478a`).            |

Figma preserves node ids across a copy, so an id resolves in **all** of these files.
**That is exactly the hazard**: an id keeps resolving after it has stopped meaning the
same thing. Never trust that an id resolved = the id is current; check it against the
trusted snapshot, by name, in-session.

## Drift is real — measured at snapshot registration (2026-09-11)

Registering `Resonance 9/10/26` immediately demonstrated the rot this file warns about,
by comparing it with the July copy the manifest had been citing:

- **`1473:81622` no longer exists.** That is the node `_index.md` screen 05 (ProfileGen
  draft) cites as built-to-design. The designer deleted or replaced the frame. The id
  still resolves happily in `Resonance (Copy)` — which is precisely why resolving in a
  stale copy proves nothing.
- **The interview flow grew ~40%**: `Onboarding/Creator/Interview` 48 → 67 frames,
  `ProfileGen/Interview` 34 → 51, `Interview/Generated` 2 → 1, total top-level MVP
  frames 261 → 310.
- The snapshot has new pages the copy lacks, including **`Weave OS Architecture`**.

Consequence: copy-derived citations are descriptive of a July copy, not of the current
design. Screen 06 was re-verified during creator-onboarding discovery; the remaining
re-verification is tracked separately. Until a screen is re-verified, its row keeps the
`copy-derived` flag.

## REST is dead — `403`

`FIGMA_ACCESS_TOKEN` returns `403`. Every REST-backed tool is unavailable:
`figma_get_file_data`, `figma_get_file_versions`, `figma_get_file_at_version`,
`download_assets`, `get_screenshot`, `get_metadata`. **Figma version ids are not
obtainable.** If a working token ever materializes, record version ids _in addition to_
hashes; do not wait for one.

## The substitute: content-hash pinning + snapshot date

Every `design.md` captured from the trusted snapshot carries a provenance block:

```
fileKey:         A33kUDiRAatoMDx3L1m2Y4
snapshotDate:    2026-09-10
nodeId:          1443:78282
capturedAt:      <ISO 8601 UTC>
capturedVia:     Desktop Bridge plugin — figma_execute + node.exportAsync({PNG, SCALE 1})
designPngSha256: <sha>
figmaVersionId:  UNAVAILABLE — REST 403; snapshot date + content hash are the drift detectors
provenance:      snapshot-derived
```

`exportAsync` at a fixed scale is byte-reproducible: re-exporting an unchanged frame
reproduces the identical PNG and hash (verified for `1443:78153` under `resonance-80bf`).
Hash matches → the frame is unchanged **within this snapshot**. Hash differs across
snapshots → the frame moved; re-audit before trusting any spec derived from it.

## Rules

1. **New captures cite only the trusted snapshot** (`A33kUDiRAatoMDx3L1m2Y4`), with the
   provenance block above. Do not add citations to any other key.
2. Screens **01–05 and 07–13** stay flagged `copy-derived` until re-verified against the
   trusted snapshot (tracked by `resonance-e30b`, split out of `resonance-6db8`). Screen
   06 and screens 14–23 are `snapshot-derived`.
3. **Read-only.** Never call a Figma write tool against any of these files. A write to a
   snapshot creates yet another divergent artifact.
4. Any citation you did not personally resolve in-session against the trusted snapshot is
   `PROVISIONAL` (README R3).
5. When a **new snapshot** is registered: add its key to the table above, demote the old
   one to cache, re-verify hashes for every `verified` screen, and note measured drift in
   this file.

## History

- Screens 01–07 were originally captured from `UYlkCL7jkCVgKWiqAVlEFp` while REST still worked;
  08–13 from `vC0O5uyMmw1o5vYHmCoOXq` via the Desktop Bridge. The chain that produced
  those copies (Starter-tier REST caps → Pro-team copy → working copy) is preserved in
  git history of this file; the lesson it taught — an id that resolves is not an id that
  means the same thing — is the reason the snapshot model above exists.
- The original target of `resonance-6db8` was read-only access to the designer's _live_
  canonical file with REST version-pinning. The snapshot model was adopted instead
  (Jared, 2026-09-11): it avoids both the access friction and the REST budget cap, at
  the cost of honest, dated staleness.
- Creator-onboarding discovery (`resonance-d99b`, 2026-09-11) re-verified screen 06 and
  added snapshot-derived screens 14–23 from the emerging-creator flow.
