import { describe, expect, it } from "vitest";
import {
  CommitProfileInputSchema,
  CreatorProfileDraftSchema,
  NameOptionSchema,
} from "./profile-draft";

const nameOption = { name: "Aria Vale", description: "Warm, earthy — evokes hand-thrown pottery." };

const validDraft = {
  nameOptions: [nameOption],
  headline: "Handmade ceramics for everyday rituals",
  bio: "I throw functional stoneware in small batches from my home studio.",
  tags: ["ceramics", "pottery", "handmade"],
};

describe("NameOptionSchema", () => {
  it("accepts a well-formed name option", () => {
    expect(NameOptionSchema.parse(nameOption)).toEqual(nameOption);
  });

  it("rejects an empty name", () => {
    expect(() => NameOptionSchema.parse({ name: "", description: "x" })).toThrow();
  });

  it("rejects an empty description", () => {
    expect(() => NameOptionSchema.parse({ name: "Aria", description: "" })).toThrow();
  });
});

describe("CreatorProfileDraftSchema", () => {
  it("accepts a well-formed draft", () => {
    expect(CreatorProfileDraftSchema.parse(validDraft)).toEqual(validDraft);
  });

  it("accepts the maximum of three name options", () => {
    const draft = { ...validDraft, nameOptions: [nameOption, nameOption, nameOption] };
    expect(CreatorProfileDraftSchema.parse(draft).nameOptions).toHaveLength(3);
  });

  it("rejects an empty nameOptions array", () => {
    expect(() => CreatorProfileDraftSchema.parse({ ...validDraft, nameOptions: [] })).toThrow();
  });

  it("rejects more than three name options", () => {
    const nameOptions = [nameOption, nameOption, nameOption, nameOption];
    expect(() => CreatorProfileDraftSchema.parse({ ...validDraft, nameOptions })).toThrow();
  });

  it("rejects an empty headline", () => {
    expect(() => CreatorProfileDraftSchema.parse({ ...validDraft, headline: "" })).toThrow();
  });

  it("rejects a headline over 200 characters", () => {
    expect(() =>
      CreatorProfileDraftSchema.parse({ ...validDraft, headline: "a".repeat(201) }),
    ).toThrow();
  });

  it("rejects a bio over 5000 characters", () => {
    expect(() =>
      CreatorProfileDraftSchema.parse({ ...validDraft, bio: "a".repeat(5001) }),
    ).toThrow();
  });

  it("rejects more than 20 tags", () => {
    const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
    expect(() => CreatorProfileDraftSchema.parse({ ...validDraft, tags })).toThrow();
  });
});

describe("CommitProfileInputSchema", () => {
  it("accepts a single chosen displayName plus edited fields", () => {
    const input = {
      displayName: "Aria Vale",
      headline: validDraft.headline,
      bio: validDraft.bio,
      tags: validDraft.tags,
    };
    expect(CommitProfileInputSchema.parse(input)).toEqual(input);
  });

  it("rejects an empty displayName", () => {
    expect(() =>
      CommitProfileInputSchema.parse({
        displayName: "",
        headline: validDraft.headline,
        bio: validDraft.bio,
        tags: validDraft.tags,
      }),
    ).toThrow();
  });

  it("rejects a displayName over 120 characters", () => {
    expect(() =>
      CommitProfileInputSchema.parse({
        displayName: "a".repeat(121),
        headline: validDraft.headline,
        bio: validDraft.bio,
        tags: validDraft.tags,
      }),
    ).toThrow();
  });
});
