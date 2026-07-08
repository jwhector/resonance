import { type EmbeddingModel, embed } from "ai";
import { createVoyage } from "voyage-ai-provider";
import { AgentError } from "./errors";

/**
 * Voyage `voyage-3.5` produces 1024-dim vectors. This pins the `vector(1024)` column in
 * `@resonance/db` (ADR-0010) — a mismatch would fail silently at query time, so every embedder
 * asserts it.
 */
export const EMBEDDING_MODEL = "voyage-3.5";
export const EMBEDDING_DIMS = 1024;

/** The minimum a profile needs to be embedded — a committed profile supplies these (offerings []). */
export interface EmbeddableProfile {
  displayName: string;
  headline: string;
  bio: string;
  tags: string[];
  offerings: { title: string; description: string }[];
}

/**
 * The embeddings seam (ADR-0010). A lot of behaviour — provider, dims, the profile→text
 * serialization — behind two calls. `embedProfile` returns exactly the fields
 * `upsertProfileEmbedding` needs, so the caller never re-derives the model id or content.
 */
export interface Embedder {
  readonly model: string;
  embed(text: string): Promise<number[]>;
  embedProfile(
    profile: EmbeddableProfile,
  ): Promise<{ model: string; content: string; embedding: number[] }>;
}

/** Flatten a profile into the single text blob that seeds its embedding. */
export function profileToContent(p: EmbeddableProfile): string {
  const offerings = p.offerings.map((o) => `${o.title}: ${o.description}`).join("\n");
  return [p.displayName, p.headline, p.bio, p.tags.join(", "), offerings]
    .filter((s) => s.length > 0)
    .join("\n\n");
}

/**
 * Build an `Embedder` from a raw text→vector function. Shared by the live providers and — via
 * `@resonance/ai/test` — the deterministic fake, so every embedder honors the same `embedProfile`
 * contract. Not re-exported from the package entrypoint (internal seam).
 */
export function makeEmbedder(
  model: string,
  embedText: (text: string) => Promise<number[]>,
): Embedder {
  return {
    model,
    embed: embedText,
    async embedProfile(profile) {
      const content = profileToContent(profile);
      return { model, content, embedding: await embedText(content) };
    },
  };
}

/**
 * Run one Voyage embedding through the AI SDK and enforce the 1024-dim contract. The `model` is
 * either the Gateway `voyage/voyage-3.5` string or a direct `voyage-ai-provider` embedding model —
 * both go through `embed`, so dims-checking and error-wrapping live in one place.
 */
async function embedVoyage(model: EmbeddingModel, text: string): Promise<number[]> {
  let embedding: number[];
  try {
    ({ embedding } = await embed({ model, value: text }));
  } catch (err) {
    throw new AgentError("embeddings: Voyage request failed", { cause: err });
  }
  if (embedding.length !== EMBEDDING_DIMS) {
    throw new AgentError(`embeddings: expected ${EMBEDDING_DIMS} dims, got ${embedding.length}`);
  }
  return embedding;
}

/**
 * The embeddings seam (ADR-0010), **live by default** (ADR-0018). No `RESONANCE_FAKES` branch —
 * shipped code always resolves a real Voyage transport; tests inject `createFakeEmbedder` from
 * `@resonance/ai/test`. Provider selection, by key precedence:
 *
 * 1. **Vercel AI Gateway** (`AI_GATEWAY_API_KEY`) — Voyage via the `voyage/voyage-3.5` string.
 * 2. **Direct Voyage** (`VOYAGE_API_KEY`) — the `voyage-ai-provider`, for running without a Gateway.
 *
 * If neither key is present it **fails closed** with an actionable error — never silently fakes.
 */
export function resolveEmbedder(): Embedder {
  if (process.env.AI_GATEWAY_API_KEY) {
    return makeEmbedder(EMBEDDING_MODEL, (text) => embedVoyage(`voyage/${EMBEDDING_MODEL}`, text));
  }
  if (process.env.VOYAGE_API_KEY) {
    const voyage = createVoyage({ apiKey: process.env.VOYAGE_API_KEY });
    const model = voyage.textEmbeddingModel(EMBEDDING_MODEL);
    return makeEmbedder(EMBEDDING_MODEL, (text) => embedVoyage(model, text));
  }
  throw new AgentError(
    "resolveEmbedder: no embedding provider configured. Set AI_GATEWAY_API_KEY " +
      "(Vercel AI Gateway, preferred) or VOYAGE_API_KEY (direct Voyage).",
  );
}
