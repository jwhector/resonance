import { type AgentDefinition, defineAgent } from "../../registry";
import { CREATOR_INTERVIEW_SYSTEM } from "./prompt";

/** Sonnet — the chat/interview tier (ADR-0009 model routing). Swappable via the Gateway. */
export const CREATOR_INTERVIEW_MODEL = "anthropic/claude-sonnet-5";

/**
 * The Weave onboarding interview: streaming chat, no tools. Run it through
 * `runAgentStream` from a route handler that pipes tokens to the client (Increment 3).
 */
export const creatorInterviewAgent: AgentDefinition = defineAgent({
  id: "creator-interview",
  model: CREATOR_INTERVIEW_MODEL,
  system: CREATOR_INTERVIEW_SYSTEM,
});
