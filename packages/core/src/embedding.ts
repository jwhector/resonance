import { ResonanceError } from "./errors";

/**
 * The one place the embedding width is written down.
 *
 * Voyage `voyage-3.5` produces 1024-dim vectors and the `embeddings.embedding` column is
 * `vector(1024)` (ADR-0010). Until now that number lived twice — a constant in
 * `@resonance/ai` and a literal in `@resonance/db`'s schema — and `db` cannot import `ai`
 * (the dependency runs the other way), so the two could only agree by coincidence. It is a
 * fact two packages need ⇒ it belongs in `core` (ADR-0003).
 */
export const EMBEDDING_DIMS = 1024;

/**
 * A vector reached a boundary with the wrong width. Named and coded so callers can branch
 * on it, and so the failure is loud: a mismatched vector does not error inside pgvector —
 * it quietly matches nothing, which reads as "no results" rather than "misconfigured
 * embedder" (ADR-0010).
 */
export class EmbeddingDimensionError extends ResonanceError {
  readonly expected: number;
  readonly received: number;

  constructor(received: number, expected: number = EMBEDDING_DIMS) {
    super(
      "embedding_dimension_mismatch",
      `Expected a ${expected}-dimension embedding, received ${received}.`,
    );
    this.name = "EmbeddingDimensionError";
    this.expected = expected;
    this.received = received;
  }
}

/**
 * Guard a vector before it touches SQL or an index. Throws {@link EmbeddingDimensionError}.
 *
 * One call instead of a hand-rolled length check at each site, so the code and message are
 * identical everywhere the check happens (locality) and a wrong-width vector can never
 * degrade into a silently empty result set.
 */
export function assertEmbeddingDims(embedding: readonly number[]): void {
  if (embedding.length !== EMBEDDING_DIMS) {
    throw new EmbeddingDimensionError(embedding.length);
  }
}
