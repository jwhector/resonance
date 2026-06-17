// @resonance/commerce — offerings, publishing, orders, services, and marketplace
// payments via Stripe Connect (ADR-0006). The data model is Connect-shaped from day
// one (creator connected accounts, application fee, payouts); the implementation is a
// stub until payments are wired.
//
// SKELETON: types + stubbed payment port. Real flows build out post-checkpoint.

import { NotImplementedError } from "@resonance/core";

/** The platform fee taken per transaction (ADR-0006). */
export const PLATFORM_FEE_RATE = 0.1;

/** Marketplace payment boundary — Connect-shaped. Stubbed (ADR-0006). */
export interface PaymentsPort {
  /** Create/destination-charge with the platform application fee, paying out a creator. */
  chargeWithPayout(args: {
    amountCents: number;
    creatorConnectedAccountId: string;
    description: string;
  }): Promise<{ chargeId: string; applicationFeeCents: number }>;
}

export const stubPayments: PaymentsPort = {
  chargeWithPayout() {
    throw new NotImplementedError(
      "@resonance/commerce payments (Stripe Connect — stubbed, ADR-0006)",
    );
  },
};
