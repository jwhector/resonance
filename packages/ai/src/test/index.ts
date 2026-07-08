// @resonance/ai/test — test-only fakes injected via DI (ADR-0018).
//
// These are NEVER imported by shipped runtime code: the live seams (`resolveModel`,
// `resolveEmbedder`) resolve real providers and fail closed without a key. Unit tests pass these
// fakes in explicitly — `runAgentStructured(agent, { model: createFakeModel(id) })`, or
// `commitCreatorProfile(ctx, ...)` with `embedder: createFakeEmbedder()` — so the fast inner loop
// stays deterministic and credential-free while runtime code has no fake branch to drift.
import type { LanguageModel } from "ai";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { EMBEDDING_DIMS, EMBEDDING_MODEL, type Embedder, makeEmbedder } from "../embeddings";
import type { ModelId } from "../registry";

const zeroUsage = () => ({
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
});

const stopReason = () => ({ unified: "stop" as const, raw: undefined });

/**
 * A deterministic, text-only stand-in language model for the streaming path. Inject it via
 * `RunInput.model` (the `resolveModel` DI seam). It cannot satisfy a forced tool call, so a
 * tool-driven agent (profile-gen) injects a tool-calling `MockLanguageModelV3` instead.
 */
export function createFakeModel(modelId: ModelId): LanguageModel {
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
