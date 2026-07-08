import { z } from "zod";
import { InterviewMessageSchema } from "@resonance/core";
import { creatorInterviewAgent, runAgentStream } from "@resonance/ai";
import { E2E_HARNESS, harnessModel } from "../../../../lib/e2e-harness";

/**
 * Weave interview stream (POST). The client (`useChat`, via `DefaultChatTransport`) maps its
 * `UIMessage[]` transcript to the shared `InterviewMessage[]` contract before sending, so the
 * payload is Zod-validated here (boundary validation, golden rule 4) and handed straight to
 * the shared streaming runner. `toUIMessageStreamResponse()` turns the model stream into the
 * HTTP stream `useChat` consumes. Orchestration + the provider key stay server-side (ADR-0009).
 * The shared runner resolves the live Gateway model by default (`resolveModel`, ADR-0018); the
 * one exception is the isolated E2E harness, which injects a deterministic model (ADR-0018 §4).
 */
const RequestSchema = z.object({
  messages: z.array(InterviewMessageSchema).min(1),
});

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid interview payload", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  return runAgentStream(creatorInterviewAgent, {
    messages: parsed.data.messages,
    ...(E2E_HARNESS ? { model: harnessModel() } : {}),
  }).toUIMessageStreamResponse();
}
