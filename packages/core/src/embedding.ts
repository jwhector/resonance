import { ResonanceError } from "./errors";

/**
 * The intended single home for the embedding width.
 *
 * Voyage `voyage-3.5` produces 1024-dim vectors and the `embeddings.embedding` column is
 * `vector(1024)` (ADR-0010). `@resonance/db` cannot import `@resonance/ai` (the dependency
 * runs the other way), so the width could previously only be agreed by coincidence — hence
 * it is a fact two packages need ⇒ it belongs in `core` (ADR-0003). Today the width is still
 * ALSO declared in `@resonance/ai` (`EMBEDDING_DIMS` in `packages/ai/src/embeddings.ts`) and
 * hard-coded as `vector(1024)` in `packages/db/src/schema/creator.ts`; converging those two
 * onto this constant is follow-up work owned by those packages' own steps (seed
 * resonance-52cd), deliberately out of this step's blast radius.
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
