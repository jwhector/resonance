import { describe, expect, it } from "vitest";
import {
  MEMBER_INTEREST_MAX,
  MEMBER_INTEREST_TARGET,
  MemberInterestsSchema,
  TopicSchema,
  TopicSlugSchema,
} from "./interests";

describe("TopicSlugSchema", () => {
  it("accepts the slugs the curated list will be seeded with", () => {
    for (const slug of ["wellness", "tea-culture", "herbalism", "workshops"]) {
      expect(TopicSlugSchema.parse(slug)).toBe(slug);
    }
  });

  it("rejects anything that would not survive a round trip through a payload or URL", () => {
    for (const bad of ["Tea Culture", "tea_culture", "tea culture", "-tea", "tea-", "TEA", ""]) {
      expect(() => TopicSlugSchema.parse(bad)).toThrow();
    }
  });
});

describe("TopicSchema", () => {
  it("pairs the wire identity with the designed chip text", () => {
    expect(TopicSchema.parse({ slug: "tea-culture", label: "Tea Culture" })).toEqual({
      slug: "tea-culture",
      label: "Tea Culture",
    });
  });

  it("trims the label so a padded seed value cannot reach the chip", () => {
    expect(TopicSchema.parse({ slug: "art", label: "  Art  " }).label).toBe("Art");
    expect(() => TopicSchema.parse({ slug: "art", label: "   " })).toThrow();
  });
});

describe("MemberInterestsSchema", () => {
  it("accepts the selection the design asks for", () => {
    const selection = { topicSlugs: ["wellness", "herbalism", "art"] };
    expect(MemberInterestsSchema.parse(selection)).toEqual(selection);
    expect(selection.topicSlugs).toHaveLength(MEMBER_INTEREST_TARGET);
  });

  it("accepts an empty selection, because skipping the picker is supported", () => {
    // The ratified decision is that the picker is skippable, so "no interests" has to be a
    // valid payload rather than a validation failure — the ranking path handles it.
    expect(MemberInterestsSchema.parse({ topicSlugs: [] }).topicSlugs).toEqual([]);
    expect(MemberInterestsSchema.parse({}).topicSlugs).toEqual([]);
  });

  it("does not enforce the designed count — the target is UI guidance, not a rule", () => {
    expect(MemberInterestsSchema.parse({ topicSlugs: ["art"] }).topicSlugs).toHaveLength(1);
    expect(
      MemberInterestsSchema.parse({ topicSlugs: ["art", "music", "design", "nature"] }).topicSlugs,
    ).toHaveLength(4);
  });

  it("rejects duplicates instead of silently deduping them", () => {
    // Quietly repairing this would hide a broken caller and make the stored count disagree
    // with what was submitted.
    expect(() => MemberInterestsSchema.parse({ topicSlugs: ["art", "art"] })).toThrow();
  });

  it("caps the selection so an unbounded array cannot arrive from a client", () => {
    const atCap = Array.from({ length: MEMBER_INTEREST_MAX }, (_, i) => `topic-${i}`);
    expect(MemberInterestsSchema.parse({ topicSlugs: atCap }).topicSlugs).toHaveLength(
      MEMBER_INTEREST_MAX,
    );
    expect(() => MemberInterestsSchema.parse({ topicSlugs: [...atCap, "one-more"] })).toThrow();
  });

  it("rejects a malformed slug inside an otherwise valid selection", () => {
    expect(() => MemberInterestsSchema.parse({ topicSlugs: ["art", "Tea Culture"] })).toThrow();
  });

  it("has no member field — identity comes from the session, never the payload", () => {
    // Same rule as DiscoveryViewer being a separate parameter: no field to spoof.
    expect(Object.keys(MemberInterestsSchema.shape)).toEqual(["topicSlugs"]);
  });
});
