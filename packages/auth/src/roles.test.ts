import { describe, expect, it } from "vitest";
import { decodeRoles, encodeRoles } from "./roles";

describe("roles codec", () => {
  it("round-trips and de-dupes", () => {
    expect(encodeRoles(["member", "creator", "member"])).toBe("member,creator");
    expect(decodeRoles("member,creator")).toEqual(["member", "creator"]);
  });
  it("defaults empty/nullish to []", () => {
    expect(decodeRoles("")).toEqual([]);
    expect(decodeRoles(null)).toEqual([]);
    expect(decodeRoles(undefined)).toEqual([]);
  });
  it("rejects unknown roles at the boundary", () => {
    expect(() => decodeRoles("member,wizard")).toThrow();
  });
});
