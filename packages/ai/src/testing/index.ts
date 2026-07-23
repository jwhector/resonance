// @resonance/ai/testing — test-only fakes injected via DI (ADR-0018).
//
// These are NEVER imported by shipped runtime code: the live seams (`resolveModel`,
// `resolveEmbedder`) resolve real providers and fail closed without a key. Unit tests pass these
// fakes in explicitly — `runAgentStructured(agent, { model: createFakeOnboardingModel() })`, or
// `commitCreatorProfile(ctx, ...)` with `embedder: createFakeEmbedder()` — so the fast inner loop
// stays deterministic and credential-free while runtime code has no fake branch to drift. The
// full-flow E2E injects `createFakeOnboardingModel()` through the apps/web E2E harness (ADR-0018 §4).
import type { LanguageModel } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { type CreatorProfileDraft, CreatorProfileDraftSchema } from "@resonance/core";
import { EMBEDDING_DIMS, EMBEDDING_MODEL, type Embedder, makeEmbedder } from "../embeddings";
import type { ModelId } from "../registry";

const zeroUsage = () => ({
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
});

const stopReason = () => ({ unified: "stop" as const, raw: undefined });
const toolCallsReason = () => ({ unified: "tool-calls" as const, raw: undefined });

/** The single canned line the fake interview model streams. The onboarding E2E asserts on it. */
const INTERVIEW_LINE = "Thanks for sharing — what first drew you to this work?";

/** The canned interview turn as an AI SDK stream — shared by both fake models below. */
function interviewStream() {
  return simulateReadableStream({
    chunks: [
      { type: "stream-start" as const, warnings: [] },
      { type: "text-start" as const, id: "0" },
      { type: "text-delta" as const, id: "0", delta: INTERVIEW_LINE },
      { type: "text-end" as const, id: "0" },
      { type: "finish" as const, finishReason: stopReason(), usage: zeroUsage() },
    ],
  });
}

/**
 * The canned profile draft the onboarding E2E asserts on (three name options + headline + tags).
 * The bio is derived from the first interview turn so the E2E can prove the transcript flows into
 * the draft. Schema-parsed so it can only ever satisfy the `proposeProfile` contract.
 */
function cannedProfileDraft(firstUserTurn: string): CreatorProfileDraft {
  const bio =
    firstUserTurn.length > 0
      ? `From our conversation: ${firstUserTurn}`.slice(0, 5000)
      : "A creator sharing the work they love with people who resonate with it.";
  return CreatorProfileDraftSchema.parse({
    nameOptions: [
      { name: "New Creator", description: "A friendly starting name drawn from your interview." },
      { name: "Weave Studio", description: "A studio-style brand you can grow into." },
      { name: "The Maker", description: "A short, descriptive handle that's easy to discover." },
    ],
    headline: "A creator sharing what they love",
    bio,
    tags: ["craft", "community"],
  });
}

/**
 * The combined onboarding fake, injected by the apps/web E2E harness (ADR-0018 §4). ONE model
 * that serves BOTH onboarding paths deterministically:
 *
 *  - `doStream` — the streaming Weave interview (`runAgentStream`) emits {@link INTERVIEW_LINE}.
 *  - `doGenerate` — ProfileGen's forced `proposeProfile` tool call (`runAgentStructured`) returns a
 *    schema-valid {@link CreatorProfileDraft} whose bio is derived from the first interview turn.
 *
 * A text-only fake could not satisfy the forced tool call, so this combined model is the one the
 * full-flow E2E uses. Never selected on a shipped path — the harness hard-guards
 * it against production (`E2E_HARNESS`), so `ai/test` never enters the live runtime.
 */
export function createFakeOnboardingModel(
  modelId: ModelId = "resonance/e2e-onboarding",
): LanguageModel {
  return new MockLanguageModelV3({
    modelId,
    doStream: async () => ({ stream: interviewStream() }),
    doGenerate: async ({ prompt }) => {
      let firstUserTurn = "";
      for (const message of prompt) {
        if (message.role === "user") {
          firstUserTurn = message.content
            .map((part) => (part.type === "text" ? part.text : ""))
            .join(" ")
            .trim();
          if (firstUserTurn.length > 0) break;
        }
      }
      return {
        content: [
          {
            type: "tool-call" as const,
            toolCallId: "fake-propose-1",
            toolName: "proposeProfile",
            input: JSON.stringify(cannedProfileDraft(firstUserTurn)),
          },
        ],
        finishReason: toolCallsReason(),
        usage: zeroUsage(),
        warnings: [],
      };
    },
  });
}

/**
 * Deterministic 1024-dim fake embedder — same text always yields the same unit vector. Injected via
 * the `Embedder` DI seam (e.g. `commitCreatorProfile`'s `ctx.embedder`). Honors the 1024-dim
 * contract (ADR-0010) so a fake-backed matching test mirrors the live Voyage shape.
 */
export function createFakeEmbedder(): Embedder {
  return makeEmbedder(EMBEDDING_MODEL, async (text) => {
    const v = new Array<number>(EMBEDDING_DIMS).fill(0);
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      // Hash char + position into a bucket so even single-character inputs differ.
      const idx = (code * 31 + i) % EMBEDDING_DIMS;
      v[idx] = (v[idx] ?? 0) + code + 1;
    }
    const norm = Math.sqrt(v.reduce((sum, x) => sum + x * x, 0)) || 1;
    return v.map((x) => x / norm);
  });
}
