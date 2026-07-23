import type { UIMessage } from "ai";
import type { InterviewMessage } from "@resonance/core";

/**
 * Pure adapters between the AI SDK's client-side `UIMessage` (what `useChat` owns — a role
 * plus a `parts[]` array) and the shared `InterviewMessage` contract from `@resonance/core`
 * (role + flat text) that both the interview stream route and `WeaveInterviewRail` speak.
 *
 * Kept as free functions (no React, no `@resonance/ai`) so they unit-test without a DOM and
 * stay the single mapping seam for both directions: request body (client → route) and rail
 * rendering (useChat → UI).
 */

/** Flatten a UIMessage's text parts into a single string. */
function textOf(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

/**
 * Narrow a single UIMessage to the shared contract, or `null` when it is not a user/assistant
 * turn (e.g. a system or data message) — those never belong in the interview transcript.
 */
export function uiMessageToInterview(message: UIMessage): InterviewMessage | null {
  if (message.role !== "user" && message.role !== "assistant") return null;
  return { role: message.role, content: textOf(message) };
}

/** Map a UIMessage transcript to the `InterviewMessage[]` the route + rail consume. */
export function uiMessagesToInterview(messages: UIMessage[]): InterviewMessage[] {
  return messages
    .map(uiMessageToInterview)
    .filter((message): message is InterviewMessage => message !== null);
}
