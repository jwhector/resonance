# ADR-0007: Media storage deferred behind a `StoragePort`

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

CoverGen images, post images, and profile photos will eventually need durable blob
storage. But the reference vertical slice (Creator Interview → ProfileGen) is
text-only, so we don't need real storage to prove the core patterns.

## Decision

Define a **`StoragePort` interface** in `@resonance/core` (e.g. `put`, `getUrl`,
`delete`) and provide a no-op/local dev stub implementation. Do not wire a real
provider yet. When needed, implement the port with **Vercel Blob** (Vercel-native,
public + private, signed uploads) without changing call sites.

## Consequences

- The slice ships without a storage dependency.
- Image-producing features (CoverGen) are blocked until the port has a real impl —
  flagged where relevant so it's a conscious step, not a surprise.
- Swapping in Vercel Blob (or S3/R2) later is a single implementation change.

## Alternatives considered

- **Vercel Blob now:** least plumbing, but unnecessary for the first slice.
- **Cloudflare R2 / S3 now:** cheaper at scale, more setup, not Vercel-native, premature.
