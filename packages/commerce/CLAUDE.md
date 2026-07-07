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

## Working here (seeds + mulch)

Work in this package is tracked by a `commerce`-labelled seed — `sd ready` / `sd search commerce` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`commerce`** mulch domain: `ml record commerce --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
