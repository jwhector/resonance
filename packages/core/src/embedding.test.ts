import { describe, expect, it } from "vitest";
import { EMBEDDING_DIMS, EmbeddingDimensionError, assertEmbeddingDims } from "./embedding";
import { ResonanceError } from "./errors";

const vec = (n: number) => Array.from({ length: n }, () => 0);

describe("assertEmbeddingDims", () => {
  it("passes a correctly sized vector through", () => {
    expect(() => assertEmbeddingDims(vec(EMBEDDING_DIMS))).not.toThrow();
  });

  it("throws a named, coded error rather than letting a bad vector reach SQL", () => {
    let thrown: unknown;
    try {
      assertEmbeddingDims(vec(768));
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(EmbeddingDimensionError);
    expect(thrown).toBeInstanceOf(ResonanceError);
    const err = thrown as EmbeddingDimensionError;
    expect(err.code).toBe("embedding_dimension_mismatch");
    expect(err.name).toBe("EmbeddingDimensionError");
    expect(err.expected).toBe(EMBEDDING_DIMS);
    expect(err.received).toBe(768);
  });

  it("rejects an empty vector", () => {
    expect(() => assertEmbeddingDims([])).toThrow(EmbeddingDimensionError);
  });
});
