# ADR-0018: Testing seams — live-by-default code, fakes injected in tests, live-smoke gate

- **Status:** Accepted
- **Date:** 2026-07-07

## Context

The reference slice (ADR-0013) was built **mock-first**: every external service — the AI
model, embeddings, mail, and the database in E2E — sits behind a runtime `RESONANCE_FAKES`
flag that swaps a fake for the live adapter (`resolveModel`, `resolveEmbedder`,
`resolveMail`). This let CI and the full-flow Playwright E2E run green with zero
credentials, which is genuinely useful for a fast, free, deterministic inner loop.

In practice it **masked real gaps**:

- The whole slice was green under fakes while the **live adapters were incomplete**. The
  Resend mail transport was never implemented (only a fail-closed stub), and the direct
  Anthropic / Voyage provider paths that `.env.example` advertises don't exist — every
  model and embedding call assumes a Vercel AI Gateway key. None of this surfaced until the
  app was actually run live, because **no test ever exercised a live path**.
- The env-flag fork lives in **shipped runtime code**, so "which path runs" is a hidden
  global — harder to read than an explicit dependency.
- Fakes **drift** from the contract the live adapter honors. The text-only fake model
  couldn't satisfy profile-gen's forced tool call, forcing a fake-of-a-fake
  (`apps/web/lib/fake-profile-model.ts`).

The informal "mock-first runtime seam" was never ratified (the design spec pointed at a
future "ADR-0016", but that number became the agentic-workflow ADR — so this decision had
no ADR at all). This ADR establishes the corrected direction and supersedes that informal
pattern.

## Decision

1. **Runtime code is live-by-default.** Shipped paths call the real adapter. There is **no
   `RESONANCE_FAKES`-style branch inside runtime code** selecting a fake. When a required
   key is absent, **fail closed** (or degrade explicitly) — never silently fake.
2. **Fakes/mocks live in test injection only.** Dependencies are passed in (DI) — the
   codebase already does this (`createAuth({ db, mail })`, `commitCreatorProfile(ctx, …)`,
   `RunInput.model`). Tests build the real function with a fake dependency; the fake
   **implementation** lives in a test-only module (`@resonance/db/testing`, `ai/test`,
   `createFakeMail`), never on a shipped runtime path.
3. **A credential-gated live-smoke gate** exercises each external service **for real** —
   one model call, one embedding, one email, one DB write — before release. It runs when
   secrets are present (CI-with-secrets / nightly / pre-deploy), not in the fast inner loop.
   "Green for release" therefore includes "the live wiring works."
4. **Full-flow E2E of the running app** is the one place a runtime seam is otherwise
   unavoidable (you cannot DI into a separate server process). Resolve it by running that
   E2E as **live-smoke** against real services (gated), rather than a runtime fake. If a
   deterministic in-process double is genuinely required, it must be an **explicit,
   isolated, clearly-named E2E-only harness** — not a general `FAKES` flag threaded through
   every seam.

Refines ADR-0011 (testing strategy) and ADR-0009 (the AI swap seams).

## Consequences

- Runtime code reads straight — one path, the live one. No hidden fork; the fake-of-a-fake
  is deleted.
- Unit/component tests stay fast, free, and deterministic (DI fakes) — the inner loop cost
  is unchanged.
- Live gaps can't hide: the live-smoke gate would have caught the Gateway-vs-Anthropic
  mismatch and the missing Resend adapter the instant it ran.
- **Cost accepted:** the live-smoke needs credentials, a small token/email budget, and a
  place to run (CI secrets / nightly). That is the price of "green means live works."
- **Migration:** the `RESONANCE_FAKES` branches in `resolveModel` / `resolveEmbedder` /
  `resolveMail` (and any proposed `resolveDb`) are refactored to DI; the deterministic
  full-flow E2E is re-pointed at live-smoke; the fake-of-a-fake is removed. Tracked as a
  plan. Existing package docs that cite the pattern as "ADR-0016" are corrected to ADR-0018.
- **Revisit trigger:** if live-smoke cost or flakiness becomes a burden, narrow its scope
  (fewer services, contract-level checks) — but do **not** reintroduce runtime fakes.

## Alternatives considered

- **Keep the mock-first runtime seam (status quo):** zero-credential CI, but it demonstrably
  masks live breakage and clutters runtime code — the exact failure mode we hit.
- **Live-by-default _testing_ (all tests hit live):** would surface live issues, but makes
  unit tests slow, costly, non-deterministic (LLM output varies), and needs secrets
  everywhere — the wrong tool for the fast layer. The split (DI fakes fast, live-smoke
  gated) keeps both properties.
- **Status quo + more discipline ("just remember to test live"):** relies on vigilance that
  a green build actively undermines; a gate is more reliable than a reminder.
