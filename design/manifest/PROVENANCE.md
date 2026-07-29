# Provenance — which Figma file this manifest actually trusts

> **Short version.** The manifest cites two different Figma files, neither of them the
> designer's canonical one, and the REST API that would let us version-pin a citation is
> returning `403`. Everything captured under `resonance-80bf` and later is therefore
> flagged `provenance: copy-derived` and pinned by a **SHA-256 of `design.png`** instead of
> a Figma version id. The real fix — read-only access to the canonical file — is filed as a
> follow-up seed, not done here.

## The three file keys in play

| fileKey                  | Name                   | Role                                                                                    |
| ------------------------ | ---------------------- | --------------------------------------------------------------------------------------- |
| `7FOYLdtzCTITjcPeGKwF31` | original               | The first file the manifest referenced. Starter-tier team, budget-capped (`mx-29478a`). |
| `UYlkCL7jkCVgKWiqAVlEFp` | Pro-team copy          | What screens **01–07** were captured from, and what `_index.md` still declares.         |
| `vC0O5uyMmw1o5vYHmCoOXq` | **`Resonance (Copy)`** | What the Desktop Bridge is connected to **today**, and the source of screens **08–13**. |

Figma preserves node ids across a copy, so an id resolves in all three. **That is exactly
the hazard**: an id keeps resolving after it has stopped meaning the same thing.

## Why this is a copy, and what it costs

Nobody made a deliberate decision to design against a copy. The chain was: the canonical
file sat in a Starter-tier team that hit a low per-team daily cap, so it was copied into a
Pro-tier team to buy budget (`mx-29478a`); a further working copy — `Resonance (Copy)` — is
what the Desktop Bridge plugin currently has open.

The cost is **citation rot, and it is silent**. The designer keeps editing the canonical
file. A copy is a snapshot. Node `1443:78153` resolves in the copy forever, so a citation
never _fails_ — it just quietly stops describing the frame the designer is now working on.
No tool errors. Nothing turns red. This is precisely the self-certification failure mode
ADR-0019 exists to prevent, reintroduced one layer down: instead of asserting parity in
prose, we would be asserting it against a stale image.

A second, blunter point: **this workflow only ever needs to READ Figma.** A copy buys
nothing for a read-only consumer. It costs integrity for free.

## REST is dead — `403`

`FIGMA_ACCESS_TOKEN` returns `403`. Every REST-backed tool is unavailable:
`figma_get_file_data`, `figma_get_file_versions`, `figma_get_file_at_version`,
`download_assets`, `get_screenshot`, `get_metadata`.

The consequence that matters here: **Figma version ids are not obtainable.** The natural
drift detector — "this capture came from version `<id>`" — cannot be recorded at all.

## The substitute: content-hash pinning

Since we cannot pin a version, we pin the bytes. Every `design.md` captured from
`vC0O5uyMmw1o5vYHmCoOXq` carries a provenance block:

```
fileKey:        vC0O5uyMmw1o5vYHmCoOXq
nodeId:         1443:78153
capturedAt:     2026-07-26T23:41:08Z
designPngSha256: f5c8377d…
figmaVersionId: UNAVAILABLE — REST 403; content hash is the drift detector
provenance:     copy-derived
```

`exportAsync` at a fixed scale is byte-reproducible: re-exporting an unchanged frame
reproduces the identical PNG and therefore the identical hash (verified for `1443:78153`
under `resonance-80bf`). So the check is cheap and needs no REST access:

```bash
# re-capture the frame via the bridge, then:
shasum -a 256 design/manifest/screens/12-search-creators/design.png
```

Hash matches → the frame is unchanged **in this copy**. Hash differs → the frame moved;
re-audit before trusting any spec derived from it.

**What this does NOT detect:** a change the designer made in the _canonical_ file. The copy
is frozen; its hash will match happily while the real design drifts away. Content hashing
catches drift _within_ the file we can see. It cannot catch drift _between_ files. Only the
migration below fixes that.

## Rules until the migration lands

1. Screens **08–13** are `copy-derived`. Treat every value in them as descriptive of
   `Resonance (Copy)` at its capture time (08–12 `2026-07-26T23:41:08Z`, 13
   `2026-07-29T07:04:23Z`), not as the designer's current intent.
2. Do not add new citations to `UYlkCL7jkCVgKWiqAVlEFp` — it is not the file the bridge is
   connected to, so a new citation against it cannot be verified in-session.
3. **Read-only.** Never call a Figma write tool against any of these files. We do not own
   the canonical file, and a write to a copy creates a fourth divergent artifact.
4. Any citation you did not personally resolve in-session is `PROVISIONAL` (README R3).

## The fix, and where it is tracked

Tracked by **`resonance-6db8`** — read-only canonical-Figma migration + ADR-0019 amendment.
Target state: point the bridge at the designer's canonical file with view access, refresh
`FIGMA_ACCESS_TOKEN` so REST version-pinning works again, version-pin every capture, write
only ever to a file we own, and demote `Resonance (Copy)` to a cache. Until that lands, this
document is the honest statement of what the manifest's citations are worth.
