import { describe, expect, it } from "vitest";
import { InterviewMessageSchema } from "./interview";

describe("InterviewMessageSchema", () => {
  it("accepts a well-formed user turn", () => {
    const parsed = InterviewMessageSchema.parse({ role: "user", content: "Hi" });
    expect(parsed).toEqual({ role: "user", content: "Hi" });
  });

  it("accepts an assistant turn", () => {
    expect(InterviewMessageSchema.parse({ role: "assistant", content: "Hello" }).role).toBe(
      "assistant",
    );
  });

  it("rejects an unknown role", () => {
    expect(() => InterviewMessageSchema.parse({ role: "system", content: "x" })).toThrow();
  });

  it("rejects a missing content field", () => {
    expect(() => InterviewMessageSchema.parse({ role: "user" })).toThrow();
  });
});
