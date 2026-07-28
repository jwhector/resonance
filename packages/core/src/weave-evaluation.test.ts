import { describe, expect, it } from "vitest";
import {
  COMPOSITE_DIMENSION,
  EVALUATION_DIMENSIONS,
  EvaluationDimensionSchema,
  PRINCIPLE_DIMENSIONS,
  PROCESS_DIMENSIONS,
  SCORE_LABELS,
  SCORED_DIMENSION_COUNT,
  SCORED_DIMENSIONS,
  ScoreSchema,
  ScoredDimensionSchema,
} from "./weave-evaluation";

describe("the two lists compose", () => {
  it("keeps the ten engine dimensions, one of which is composite", () => {
    expect(EVALUATION_DIMENSIONS).toHaveLength(10);
    expect(EVALUATION_DIMENSIONS).toContain(COMPOSITE_DIMENSION);
    expect(EvaluationDimensionSchema.options).toEqual([...EVALUATION_DIMENSIONS]);
  });

  it("derives the nine leaves from the ten, so they cannot drift", () => {
    expect(PROCESS_DIMENSIONS).toEqual(
      EVALUATION_DIMENSIONS.filter((dimension) => dimension !== COMPOSITE_DIMENSION),
    );
    expect(PROCESS_DIMENSIONS).toHaveLength(9);
  });

  it("decomposes the composite into one sub-score per interaction principle", () => {
    expect(PRINCIPLE_DIMENSIONS).toHaveLength(7);
    // The sub-scores are principle record ids, addressable in the corpus.
    for (const dimension of PRINCIPLE_DIMENSIONS) expect(dimension).toMatch(/^[a-z][a-z0-9_]*$/);
  });

  it("scores sixteen things: seven principle sub-scores plus the nine leaves", () => {
    expect(SCORED_DIMENSION_COUNT).toBe(16);
    expect(SCORED_DIMENSIONS).toHaveLength(PRINCIPLE_DIMENSIONS.length + PROCESS_DIMENSIONS.length);
    expect(new Set(SCORED_DIMENSIONS).size).toBe(16);
    expect(ScoredDimensionSchema.options).toEqual([...SCORED_DIMENSIONS]);
  });

  it("never scores the composite directly — it is expressed by its sub-scores", () => {
    expect(SCORED_DIMENSIONS).not.toContain(COMPOSITE_DIMENSION);
    expect(() => ScoredDimensionSchema.parse(COMPOSITE_DIMENSION)).toThrow();
  });
});

describe("the score scale", () => {
  it("uses the corpus's 0-3 scale with its authored labels", () => {
    expect(SCORE_LABELS[0]).toBe("not_observed");
    expect(SCORE_LABELS[3]).toBe("strong");
    for (const score of [0, 1, 2, 3]) expect(ScoreSchema.parse(score)).toBe(score);
  });

  it("rejects anything off the scale, including a fractional score", () => {
    expect(() => ScoreSchema.parse(4)).toThrow();
    expect(() => ScoreSchema.parse(-1)).toThrow();
    expect(() => ScoreSchema.parse(2.5)).toThrow();
  });

  it("reserves 0 for not-observed, which is what makes full coverage always possible", () => {
    expect(SCORE_LABELS[0]).toBe("not_observed");
    expect(ScoreSchema.parse(0)).toBe(0);
  });
});
