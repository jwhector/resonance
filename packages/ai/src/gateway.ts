import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { AgentError } from "./errors";
import { selectProvider } from "./provider-config";
import type { ModelId } from "./registry";

/**
 * The model swap seam (ADR-0009). Resolves an agent's `provider/model` id to a concrete
 * `LanguageModel`. **Live by default** (ADR-0018) — there is no `RESONANCE_FAKES` branch here;
 * shipped code always resolves a real transport, and a test injects a fake via `opts.model`
 * (unit tests pass a `MockLanguageModelV3`). Provider selection, by key precedence:
 *
 * 1. **`opts.model`** — a caller-injected model (unit tests pass a `MockLanguageModelV3`). Wins so
 *    tests never touch a live path.
 * 2. **Vercel AI Gateway** (`AI_GATEWAY_API_KEY`) — return the `provider/model` string; the AI SDK
 *    v6 global provider routes it, so a per-task model swap stays config, not code.
 * 3. **Direct Anthropic** (`ANTHROPIC_API_KEY`) — the `@ai-sdk/anthropic` provider, for running
 *    without a Gateway. Serves `anthropic/*` model ids (the only tier we route directly).
 *
 * The Gateway→direct→fail-closed ladder is shared with `resolveEmbedder` via `selectProvider`, so
 * the two seams can't drift. If neither key is present it **fails closed** with an actionable
 * error — never silently fakes.
 */
export function resolveModel(modelId: ModelId, opts?: { model?: LanguageModel }): LanguageModel {
  if (opts?.model) return opts.model;
  return selectProvider<LanguageModel>({
    gatewayKey: process.env.AI_GATEWAY_API_KEY,
    // Return the `provider/model` string; the AI SDK v6 global provider routes it via the Gateway.
    buildGateway: () => modelId,
    directKey: process.env.ANTHROPIC_API_KEY,
    buildDirect: () => resolveDirectAnthropic(modelId),
    missing:
      `resolveModel: no AI provider configured for "${modelId}". Set AI_GATEWAY_API_KEY ` +
      `(Vercel AI Gateway, preferred) or ANTHROPIC_API_KEY (direct Anthropic).`,
  });
}

const ANTHROPIC_PREFIX = "anthropic/";

/**
 * Direct-Anthropic fallback: strip the Gateway `anthropic/` namespace and hand the bare model id
 * to the `@ai-sdk/anthropic` provider (keyed off `ANTHROPIC_API_KEY`). Only `anthropic/*` ids can
 * be served directly — anything else needs the Gateway, so we fail closed with a clear pointer.
 */
function resolveDirectAnthropic(modelId: ModelId): LanguageModel {
  if (!modelId.startsWith(ANTHROPIC_PREFIX)) {
    throw new AgentError(
      `resolveModel: the direct Anthropic provider can only serve "anthropic/*" models, ` +
        `got "${modelId}". Set AI_GATEWAY_API_KEY to route "${modelId}" through the Gateway.`,
    );
  }
  const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return anthropic(modelId.slice(ANTHROPIC_PREFIX.length));
}
