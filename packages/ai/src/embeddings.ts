import { embed } from "ai";
import { AgentError } from "./errors";

/**
 * Voyage `voyage-3.5` produces 1024-dim vectors. This pins the `vector(1024)` column in
 * `@resonance/db` (ADR-0010) — a mismatch would fail silently at query time, so both the
 * live and fake embedders assert it.
 */
export const EMBEDDING_MODEL = "voyage-3.5";
export const EMBEDDING_DIMS = 1024;

/** The minimum a profile needs to be embedded — structurally satisfied by a GeneratedProfile. */
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

function makeEmbedder(model: string, embedText: (text: string) => Promise<number[]>): Embedder {
  return {
    model,
    embed: embedText,
    async embedProfile(profile) {
      const content = profileToContent(profile);
      return { model, content, embedding: await embedText(content) };
    },
  };
}

/** Live embedder: Voyage via the AI Gateway (`voyage/voyage-3.5`, `AI_GATEWAY_API_KEY`). */
export function createLiveEmbedder(): Embedder {
  return makeEmbedder(EMBEDDING_MODEL, async (text) => {
    let embedding: number[];
    try {
      ({ embedding } = await embed({ model: `voyage/${EMBEDDING_MODEL}`, value: text }));
    } catch (err) {
      throw new AgentError("embeddings: Voyage request failed", { cause: err });
    }
    if (embedding.length !== EMBEDDING_DIMS) {
      throw new AgentError(`embeddings: expected ${EMBEDDING_DIMS} dims, got ${embedding.length}`);
    }
    return embedding;
  });
}

/** Deterministic 1024-dim fake — same text always yields the same unit vector. */
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

/** Pick the embedder for the current environment — fake under RESONANCE_FAKES, else live. */
export function resolveEmbedder(): Embedder {
  return process.env.RESONANCE_FAKES === "1" ? createFakeEmbedder() : createLiveEmbedder();
}
