import type { LanguageModel } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import type { ModelId } from "./registry";

/**
 * The model swap seam (ADR-0009). Resolves an agent's `provider/model` id to a concrete
 * `LanguageModel`, choosing the transport by environment:
 *
 * - **live** — return the id string; the AI SDK v6 global provider routes it through the
 *   Vercel AI Gateway (`AI_GATEWAY_API_KEY`), so a per-task model swap is config, not code.
 * - **`RESONANCE_FAKES=1`** — a deterministic canned model, so the streaming interview flow
 *   runs end-to-end with zero credentials (design spec § Mock-first runtime seam).
 * - **`opts.model`** — a caller-injected model (unit tests pass a `MockLanguageModelV3`).
 *
 * The fakes path is text-only; a tool-calling agent (profile-gen) under fakes injects its
 * own canned model via `opts.model` when its transcript-to-profile content is wired (Increment 3).
 */
export function resolveModel(modelId: ModelId, opts?: { model?: LanguageModel }): LanguageModel {
  if (opts?.model) return opts.model;
  if (process.env.RESONANCE_FAKES === "1") return createFakeModel(modelId);
  return modelId;
}

const zeroUsage = () => ({
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
});

const stopReason = () => ({ unified: "stop" as const, raw: undefined });

/** A deterministic, text-only stand-in used under RESONANCE_FAKES (dev/E2E, never production). */
function createFakeModel(modelId: ModelId): LanguageModel {
  const line = "Thanks for sharing — what first drew you to this work?";
  return new MockLanguageModelV3({
    modelId,
    doGenerate: async () => ({
      content: [{ type: "text" as const, text: line }],
      finishReason: stopReason(),
      usage: zeroUsage(),
      warnings: [],
    }),
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "stream-start" as const, warnings: [] },
          { type: "text-start" as const, id: "0" },
          { type: "text-delta" as const, id: "0", delta: line },
          { type: "text-end" as const, id: "0" },
          { type: "finish" as const, finishReason: stopReason(), usage: zeroUsage() },
        ],
      }),
    }),
  });
}
