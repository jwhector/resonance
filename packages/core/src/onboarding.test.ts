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

  it("splits the whole set both ways, so a new intent cannot join silently", () => {
    // Pinning BOTH sides is what makes this a tripwire: a fourth intent lands in one list or
    // the other and fails that expectation, forcing whoever adds it to say which it is.
    const creator = ONBOARDING_INTENTS.filter((intent) => isCreatorIntent(intent));
    const browsing = ONBOARDING_INTENTS.filter((intent) => !isCreatorIntent(intent));

    expect(creator).toEqual<OnboardingIntent[]>(["share", "business"]);
    expect(browsing).toEqual<OnboardingIntent[]>(["explore"]);
  });
});

describe("ONBOARDING_INTENTS", () => {
  it("keeps the screen's order, which callers rely on to render controls", () => {
    expect(ONBOARDING_INTENTS).toEqual(["explore", "share", "business"]);
  });
});
