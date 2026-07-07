import { describe, expect, it } from "vitest";
import { ProfileGenSchema } from "./profile-gen.schema";

const valid = {
  displayName: "Ada",
  headline: "Maker of small tools",
  bio: "I build things.",
  tags: ["tools"],
  offerings: [{ title: "Workshop", description: "A session" }],
};

describe("ProfileGenSchema", () => {
  it("accepts a well-formed generated profile", () => {
    expect(ProfileGenSchema.parse(valid)).toEqual(valid);
  });

  it("accepts an empty offerings list", () => {
    expect(ProfileGenSchema.parse({ ...valid, offerings: [] }).offerings).toEqual([]);
  });

  it("rejects an empty displayName", () => {
    expect(() => ProfileGenSchema.parse({ ...valid, displayName: "" })).toThrow();
  });

  it("rejects a malformed offering", () => {
    expect(() =>
      ProfileGenSchema.parse({ ...valid, offerings: [{ title: "no description" }] }),
    ).toThrow();
  });

  it("rejects more than 20 tags", () => {
    expect(() =>
      ProfileGenSchema.parse({ ...valid, tags: Array.from({ length: 21 }, (_, i) => `t${i}`) }),
    ).toThrow();
  });
});
