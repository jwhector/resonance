# @resonance/core

Cross-cutting types, errors, and ports shared across packages. The shared base of the
dependency graph (ADR-0003). **No domain logic, no I/O** — just the vocabulary other
packages speak.

## What's here

- `errors.ts` — `ResonanceError` (stable `code`), `NotImplementedError`,
  `ValidationError`. Throw these, not bare strings.
- `ports/storage.ts` — `StoragePort` interface + `stubStorage` (media deferred, ADR-0007).
- `types.ts` — `Role` (+ Zod schema), branded `Id<Brand>` helper.

## Rules

- Everything here is depended on by other packages, so keep it stable and minimal.
  Add something only when **2+ packages** need it.
- Ports (interfaces for external capabilities) live here; their concrete adapters live
  in the relevant package or app. This is how we keep logic extraction-ready.
- No dependency on any other `@resonance/*` package (it's the root of the graph).
