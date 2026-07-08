import type { LanguageModel } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { CreatorProfileDraftSchema, type InterviewMessage } from "@resonance/core";

/**
 * Determinism seam for ProfileGen under `RESONANCE_FAKES=1` (dev / E2E, never production).
 *
 * The shared fake model in `@resonance/ai`'s gateway is deliberately text-only, so it cannot
 * satisfy `profileGenAgent`'s forced `proposeProfile` tool call — its own comment defers that
 * to "Increment 3", which is this web layer. This builds a canned model that always calls
 * `proposeProfile` with a schema-valid `CreatorProfileDraft` derived from the transcript, and
 * is injected via `runAgentStructured`'s `model` seam so the whole onboarding flow runs with
 * zero credentials. Lives in a module that is only dynamically imported under the fakes flag,
 * so `ai/test` never enters the production path.
 */
export function createFakeProposeModel(messages: InterviewMessage[]): LanguageModel {
  const firstUser = messages.find((m) => m.role === "user")?.content.trim();
  const bio =
    firstUser && firstUser.length > 0
      ? `From our conversation: ${firstUser}`.slice(0, 5000)
      : "A creator sharing the work they love with people who resonate with it.";

  const draft = CreatorProfileDraftSchema.parse({
    nameOptions: [
      { name: "New Creator", description: "A friendly starting name drawn from your interview." },
      { name: "Weave Studio", description: "A studio-style brand you can grow into." },
      { name: "The Maker", description: "A short, descriptive handle that's easy to discover." },
    ],
    headline: "A creator sharing what they love",
    bio,
    tags: ["craft", "community"],
  });

  const usage = {
    inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 0, text: 0, reasoning: undefined },
  };

  return new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [
        {
          type: "tool-call",
          toolCallId: "fake-propose-1",
          toolName: "proposeProfile",
          input: JSON.stringify(draft),
        },
      ],
      finishReason: { unified: "tool-calls" as const, raw: undefined },
      usage,
      warnings: [],
    }),
  });
}
