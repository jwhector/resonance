import { z } from "zod";

/**
 * A single turn in the Weave onboarding interview.
 *
 * The shared chat contract spoken by three packages — `@resonance/ai` (the runner's
 * streaming input), `apps/web` (validating the interview route's message payload), and
 * `@resonance/ui` (the streaming rail). Cross-cutting ⇒ it lives here (ADR-0003), not in
 * any one consumer. Deliberately minimal: role + text, no ids or timestamps — the
 * transcript is ephemeral client state until `generateProfile` (design spec § Increment 1).
 */
export const InterviewMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export type InterviewMessage = z.infer<typeof InterviewMessageSchema>;
