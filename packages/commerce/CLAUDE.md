# @resonance/commerce

Offerings, publishing, orders, the services lifecycle, returns, and **marketplace
payments via Stripe Connect** (ADR-0006). Creators receive money; the platform takes
`PLATFORM_FEE_RATE` (10%) per transaction.

## Status: STUBBED (data model Connect-shaped)

The architecture assumes Connect (connected accounts, destination charges, application
fee, payouts, refunds, ledger) — see ADR-0006 — but the implementation is a stub
(`stubPayments` throws). Build out post-checkpoint; the data model won't need rework.

## Rules

- Depends on `@resonance/core`, `@resonance/db`. **Must not** depend on
  `@resonance/community` (sibling domain) — coordinate via the app or `core`.
- Payment provider access goes behind `PaymentsPort`; the real Stripe adapter is the
  concrete implementation. Validate webhooks with Zod at the boundary.
- Money in integer cents; never floats.
