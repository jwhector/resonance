import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { uiMessageToInterview, uiMessagesToInterview } from "./interview-messages";

/** Build a minimal UIMessage with one or more text parts. */
function ui(role: UIMessage["role"], ...texts: string[]): UIMessage {
  return {
    id: `${role}-${texts.join("|")}`,
    role,
    parts: texts.map((text) => ({ type: "text", text })),
  } as UIMessage;
}

describe("uiMessageToInterview", () => {
  it("flattens text parts into a single InterviewMessage", () => {
    expect(uiMessageToInterview(ui("user", "hello ", "world"))).toEqual({
      role: "user",
      content: "hello world",
    });
  });

  it("keeps assistant turns", () => {
    expect(uiMessageToInterview(ui("assistant", "hi there"))).toEqual({
      role: "assistant",
      content: "hi there",
    });
  });

  it("drops non-text parts when flattening", () => {
    const message = {
      id: "m1",
      role: "user",
      parts: [
        { type: "step-start" },
        { type: "text", text: "only this" },
        { type: "data-foo", data: { x: 1 } },
      ],
    } as unknown as UIMessage;
    expect(uiMessageToInterview(message)).toEqual({ role: "user", content: "only this" });
  });

  it("returns null for roles outside the transcript (e.g. system)", () => {
    expect(uiMessageToInterview(ui("system", "you are weave"))).toBeNull();
  });
});

describe("uiMessagesToInterview", () => {
  it("maps a transcript and filters out non user/assistant turns", () => {
    const messages = [ui("system", "sys"), ui("user", "q"), ui("assistant", "a")];
    expect(uiMessagesToInterview(messages)).toEqual([
      { role: "user", content: "q" },
      { role: "assistant", content: "a" },
    ]);
  });

  it("returns an empty array for an empty transcript", () => {
    expect(uiMessagesToInterview([])).toEqual([]);
  });
});
