# ADR-0006: Stripe Connect — modeled now, stubbed implementation

- **Status:** Accepted
- **Date:** 2026-06-16

## Context

Resonance is a marketplace: creators receive money and the platform takes ~10% per
transaction. That is a payment _split_ with payouts — fundamentally Stripe Connect,
not single-party charges. The data model must assume the right shape now even though
we won't wire real payments during scaffolding.

## Decision

Design `@resonance/commerce` around a **Stripe Connect** marketplace: creator
connected accounts, destination/separate charges with an application fee, payouts,
refunds, and a ledger. Ship a **stub/sandbox implementation** behind a clean
interface for now; the data model and package API are Connect-shaped from day one.

## Consequences

- No costly rework of the data model when real payments land.
- Scaffolding stays light — no live Connect onboarding/webhook work yet.
- The stub must be obviously a stub (clear `NotImplemented`/sandbox behavior) so it's
  never mistaken for working payments.

## Alternatives considered

- **Plain Stripe Checkout now:** simpler, but single-party; the model would need
  rework for payouts/fees later.
- **Full Connect now:** correct but heavy before the patterns are proven.
