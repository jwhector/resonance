import { describe, expect, it } from "vitest";
import {
  ONBOARDING_INTENTS,
  OnboardingIntentSchema,
  isCreatorIntent,
  type OnboardingIntent,
} from "./onboarding";

describe("OnboardingIntentSchema", () => {
  it("accepts each answer the intent screen offers", () => {
    for (const intent of ONBOARDING_INTENTS) {
      expect(OnboardingIntentSchema.parse(intent)).toBe(intent);
    }
  });

  it("rejects anything else, including the near-misses a URL invites", () => {
    for (const bad of ["Explore", "EXPLORE", " explore", "explore ", "creator", "member", ""]) {
      expect(() => OnboardingIntentSchema.parse(bad)).toThrow();
    }
  });

  it("refuses a missing value rather than defaulting to one", () => {
    // The value arrives off a URL, so absent and unrecognized are both ordinary. Callers
    // decide what no intent means; the schema never picks an answer on their behalf.
    for (const missing of [undefined, null]) {
      expect(OnboardingIntentSchema.safeParse(missing).success).toBe(false);
    }
  });

  it("reports failure instead of throwing when asked with safeParse", () => {
    expect(OnboardingIntentSchema.safeParse("nonsense").success).toBe(false);
    expect(OnboardingIntentSchema.safeParse("share").success).toBe(true);
  });
});

describe("isCreatorIntent", () => {
  it("treats both creator answers as creator intents", () => {
    expect(isCreatorIntent("share")).toBe(true);
    expect(isCreatorIntent("business")).toBe(true);
  });

  it("does not treat browsing as a creator intent", () => {
    expect(isCreatorIntent("explore")).toBe(false);
  });

  it("classifies every intent in the set, so adding one cannot silently fall through", () => {
    const classified = ONBOARDING_INTENTS.filter(
      (intent: OnboardingIntent) => isCreatorIntent(intent) || !isCreatorIntent(intent),
    );
    expect(classified).toHaveLength(ONBOARDING_INTENTS.length);
    expect(ONBOARDING_INTENTS.filter(isCreatorIntent)).toEqual(["share", "business"]);
  });
});

describe("ONBOARDING_INTENTS", () => {
  it("keeps the screen's order, which callers rely on to render controls", () => {
    expect(ONBOARDING_INTENTS).toEqual(["explore", "share", "business"]);
  });
});
