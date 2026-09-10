// @vitest-environment node
// Pure arithmetic over the embedder — no DOM, so it does not pay for jsdom.
import { createFakeEmbedder } from "@resonance/ai/testing";
import { describe, expect, it } from "vitest";
import { discoveryQueryFor, runQueryToken, SECOND_FIXTURE_SUFFIX } from "./discovery-query";

/**
 * Pins the ranking property `discovery-query.ts` exists to provide, against the real embedder the
 * E2E harness uses.
 *
 * This is a unit test rather than an E2E assertion because the failure it guards against is
 * invisible until a cleanup failure has already leaked rows — by which point it surfaces in
 * `discovery.spec.ts` as a missing result row, which reads like a ranking regression in product
 * code. It cost an afternoon of exactly that misdiagnosis once. Asserting the margin directly
 * makes a regression here fail as itself.
 */

const embedder = createFakeEmbedder();

async function similarity(a: string, b: string): Promise<number> {
  const [va, vb] = await Promise.all([embedder.embed(a), embedder.embed(b)]);
  return va.reduce((sum, x, i) => sum + x * (vb[i] ?? 0), 0);
}

/** Read once, so an id built for a given offset is the same id however long the suite takes. */
const BASE_MS = Date.now();

/**
 * Fixture ids as the spec builds them: the worker index, then `Date.now().toString(36)` plus four
 * random characters. The offsets are the adversarial cases — runs close in time share the most
 * timestamp characters, and workers within one run differ only in the leading index.
 */
const runIdAt = (msOffset: number, random: string, worker = 0): string =>
  `w${worker}-${(BASE_MS + msOffset).toString(36)}${random}`;

describe("runQueryToken", () => {
  it("is deterministic for a given run id", () => {
    expect(runQueryToken("abc123")).toBe(runQueryToken("abc123"));
  });

  it("avalanches: a one-character change rewrites the whole token", () => {
    const a = runQueryToken("w0-m4x9q1a1b2");
    const b = runQueryToken("w1-m4x9q1a1b2");
    expect(a).toHaveLength(40);
    expect(b).toHaveLength(40);
    const shared = [...a].filter((ch, i) => ch === b[i]).length;
    // ~1/36 of positions collide by chance; anything near a shared prefix would be a regression.
    expect(shared).toBeLessThan(8);
  });
});

describe("discoveryQueryFor", () => {
  it("stays inside the DiscoveryQuerySchema 200-character cap", () => {
    expect(discoveryQueryFor(runIdAt(0, "a1b2")).length).toBeLessThanOrEqual(200);
  });

  it("ranks the exact-text fixture above the near match", async () => {
    const query = discoveryQueryFor(runIdAt(0, "a1b2"));
    const top = await similarity(query, query);
    const second = await similarity(query, query + SECOND_FIXTURE_SUFFIX);
    expect(top).toBeGreaterThan(second);
  });

  it("leaves a leaked fixture from another run ranked below this run's second fixture", async () => {
    const current = runIdAt(0, "a1b2");
    const query = discoveryQueryFor(current);
    const second = await similarity(query, query + SECOND_FIXTURE_SUFFIX);

    // The adversarial spread: a run one millisecond earlier shares all but one character of its
    // id, which is the case the original English-phrase query lost to. A sibling WORKER of this
    // run is nearer still — the same id but for the leading index — and its rows are live rather
    // than leaked, so they must be just as unable to displace this worker's `second`.
    const leaked = [
      runIdAt(0, "a1b2", 1),
      runIdAt(-1, "a1b3"),
      runIdAt(-1_000, "c3d4"),
      runIdAt(-60_000, "e5f6"),
      runIdAt(-3_600_000, "9z8y"),
      runIdAt(-86_400_000, "kk11"),
    ];

    for (const runId of leaked) {
      const leakedQuery = discoveryQueryFor(runId);
      // Both rows a leaked run seeds as `ready` — its top and its second.
      for (const content of [leakedQuery, leakedQuery + SECOND_FIXTURE_SUFFIX]) {
        expect(await similarity(query, content)).toBeLessThan(second);
      }
    }
  });
});
