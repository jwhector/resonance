import {
  CreatorResultPageSchema,
  CreatorDiscoveryQuerySchema,
  EmbeddingDimensionError,
  ResonanceError,
  type CreatorResult,
} from "@resonance/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createDiscoveryAdapter } from "../adapters/discovery-adapter";
import { user } from "../schema/auth";
import type { CreatorProfileInput } from "../schema/creator";
import { createTestDb, type TestDb } from "../testing/create-test-db";
import { searchCreatorProfiles } from "./discovery";
import { followCreator } from "./follows";
import { createCreatorProfile, upsertProfileEmbedding } from "./profiles";

/**
 * The `DiscoveryPort` interface contract, invariant by invariant, against real Postgres+pgvector
 * (PGlite). The interface is the test surface: everything here goes through the same seam the web
 * layer will, so a change that satisfies the tests satisfies callers.
 */

const DIMS = 1024;

/**
 * A unit vector in the e0/e1 plane whose cosine similarity to `probe()` is exactly `w`.
 * Ranking tests can therefore assert on *chosen* similarities instead of on whatever the
 * embedder happens to produce.
 */
function vec(w: number): number[] {
  const v = Array.from({ length: DIMS }, () => 0);
  v[0] = w;
  v[1] = Math.sqrt(Math.max(0, 1 - w * w));
  return v;
}
const probe = () => vec(1);

describe("searchCreatorProfiles — the DiscoveryPort contract", () => {
  let db: TestDb;
  let close: () => Promise<void>;

  // Generous hookTimeout: PGlite WASM cold-init + migrations is ~1s in isolation but can exceed the
  // 10s default under parallel test-suite CPU contention in CI (seed resonance-75e5).
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await db.insert(user).values(
      Array.from({ length: 8 }, (_, i) => ({
        id: `u${i}`,
        name: `User ${i}`,
        email: `u${i}@x.com`,
      })),
    );
  }, 30000);
  afterEach(async () => {
    await close();
  });

  /** Seed one ready creator whose embedding sits at similarity `w` from `probe()`. */
  async function seed(
    userId: string,
    w: number,
    overrides: Partial<CreatorProfileInput> = {},
  ): Promise<{ id: string; userId: string }> {
    const profile = await createCreatorProfile(db, {
      userId,
      displayName: `Creator ${userId}`,
      headline: "h",
      bio: "b",
      tags: [],
      offerings: [],
      status: "ready",
      ...overrides,
    });
    await upsertProfileEmbedding(db, {
      profileId: profile.id,
      model: "voyage-3.5",
      content: "c",
      embedding: vec(w),
    });
    return { id: profile.id, userId };
  }

  // ── Invariant 2: descending similarity ──────────────────────────────────────────────────
  it("orders results by descending similarity", async () => {
    const low = await seed("u0", 0.2);
    const high = await seed("u1", 0.9);
    const mid = await seed("u2", 0.5);

    const { results } = await searchCreatorProfiles(db, { embedding: probe() });

    expect(results.map((r) => r.profileId)).toEqual([high.id, mid.id, low.id]);
    expect(results[0]!.similarity).toBeCloseTo(0.9, 5);
    expect(results[2]!.similarity).toBeCloseTo(0.2, 5);
  });

  it("returns every field CreatorResultSchema requires, and no avatar", async () => {
    const seeded = await seed("u0", 0.8, { tags: ["pottery", "ceramics"] });

    const { results, nextCursor } = await searchCreatorProfiles(db, { embedding: probe() });
    const page = CreatorResultPageSchema.parse({ kind: "creators", results, nextCursor });

    expect(page.results).toHaveLength(1);
    const row = page.results[0]!;
    expect(row).toEqual({
      profileId: seeded.id,
      userId: "u0",
      displayName: "Creator u0",
      headline: "h",
      tags: ["pottery", "ceramics"],
      similarity: expect.closeTo(0.8, 5) as unknown as number,
      followState: "unknown",
    });
    // creator_profiles has no image column; the row deliberately carries no avatar field.
    expect(row).not.toHaveProperty("avatarUrl");
  });

  // ── Invariant 3: threshold ──────────────────────────────────────────────────────────────
  it("returns only results at or above the threshold", async () => {
    await seed("u0", 0.2);
    const mid = await seed("u1", 0.6);
    const high = await seed("u2", 0.95);

    const { results } = await searchCreatorProfiles(db, { embedding: probe(), threshold: 0.6 });

    expect(results.map((r) => r.profileId)).toEqual([high.id, mid.id]);
    for (const r of results) expect(r.similarity).toBeGreaterThanOrEqual(0.6 - 1e-9);
  });

  it("returns an empty page — not an error — when the threshold excludes everything", async () => {
    await seed("u0", 0.2);
    const page = await searchCreatorProfiles(db, { embedding: probe(), threshold: 0.99 });
    expect(page.results).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  // ── Invariant 4: limit + nextCursor semantics ───────────────────────────────────────────
  it("returns at most `limit` results and a non-null nextCursor iff more may follow", async () => {
    for (let i = 0; i < 5; i++) await seed(`u${i}`, 0.9 - i * 0.1);

    const first = await searchCreatorProfiles(db, { embedding: probe(), limit: 2 });
    expect(first.results).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    // Exactly-full final page: 5 rows, limit 5 ⇒ the page is full but nothing follows, and
    // nextCursor must still be null. (A naive "full page ⇒ cursor" would fail here.)
    const exact = await searchCreatorProfiles(db, { embedding: probe(), limit: 5 });
    expect(exact.results).toHaveLength(5);
    expect(exact.nextCursor).toBeNull();
  });

  it("paginates through the full ranking exactly once, in order", async () => {
    const seeded: string[] = [];
    for (let i = 0; i < 7; i++) seeded.push((await seed(`u${i}`, 0.9 - i * 0.1)).id);

    const seen: CreatorResult[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
      const page: Awaited<ReturnType<typeof searchCreatorProfiles>> = await searchCreatorProfiles(
        db,
        { embedding: probe(), limit: 3, cursor },
      );
      seen.push(...page.results);
      cursor = page.nextCursor;
      pages += 1;
      expect(pages).toBeLessThan(10); // guard against a cursor that never advances
    } while (cursor !== null);

    expect(pages).toBe(3);
    expect(seen.map((r) => r.profileId)).toEqual(seeded);
    expect(new Set(seen.map((r) => r.profileId)).size).toBe(7);
  });

  it("breaks similarity ties deterministically so paging cannot skip or repeat a row", async () => {
    // Four profiles at the SAME similarity: without a tiebreaker the sort is unstable across
    // queries and keyset paging silently drops rows.
    const ids = [];
    for (let i = 0; i < 4; i++) ids.push((await seed(`u${i}`, 0.5)).id);
    const expected = [...ids].sort();

    const first = await searchCreatorProfiles(db, { embedding: probe(), limit: 2 });
    const second = await searchCreatorProfiles(db, {
      embedding: probe(),
      limit: 2,
      cursor: first.nextCursor,
    });

    expect([...first.results, ...second.results].map((r) => r.profileId)).toEqual(expected);
    expect(second.nextCursor).toBeNull();
  });

  // ── Invariant 5: follow state is per-viewer ─────────────────────────────────────────────
  it("reports every row as unknown when there is no viewer", async () => {
    await seed("u0", 0.9);
    await seed("u1", 0.5);
    await followCreator(db, { followerId: "u2", followingId: "u0" });

    const { results } = await searchCreatorProfiles(db, { embedding: probe(), viewerId: null });

    expect(results.map((r) => r.followState)).toEqual(["unknown", "unknown"]);
  });

  it("never reports unknown when a viewer is present", async () => {
    await seed("u0", 0.9);
    await seed("u1", 0.5);
    await followCreator(db, { followerId: "u2", followingId: "u0" });

    const { results } = await searchCreatorProfiles(db, { embedding: probe(), viewerId: "u2" });

    expect(results.map((r) => [r.userId, r.followState])).toEqual([
      ["u0", "following"],
      ["u1", "not_following"],
    ]);
    expect(results.some((r) => r.followState === "unknown")).toBe(false);
  });

  it("resolves follow state per viewer, not globally", async () => {
    await seed("u0", 0.9);
    await followCreator(db, { followerId: "u2", followingId: "u0" });

    const other = await searchCreatorProfiles(db, { embedding: probe(), viewerId: "u3" });
    expect(other.results[0]!.followState).toBe("not_following");
  });

  // ── Invariant 6: drafts never appear ────────────────────────────────────────────────────
  it("excludes draft profiles even when they outrank every ready one", async () => {
    await seed("u0", 1, { status: "draft" });
    const ready = await seed("u1", 0.1);

    const { results } = await searchCreatorProfiles(db, { embedding: probe() });

    expect(results.map((r) => r.profileId)).toEqual([ready.id]);
  });

  // ── Invariant 7: throw, don't return an empty page ──────────────────────────────────────
  it("throws EmbeddingDimensionError for a wrong-width vector instead of matching nothing", async () => {
    await seed("u0", 0.9);
    const short = Array.from({ length: 512 }, () => 0);

    // The failure mode this guards: pgvector does not error on a width mismatch, it quietly
    // matches nothing — indistinguishable from "no results" (ADR-0010).
    await expect(searchCreatorProfiles(db, { embedding: short })).rejects.toBeInstanceOf(
      EmbeddingDimensionError,
    );
    await expect(searchCreatorProfiles(db, { embedding: short })).rejects.toMatchObject({
      code: "embedding_dimension_mismatch",
      received: 512,
      expected: 1024,
    });
  });

  it("throws a typed error for a malformed cursor", async () => {
    await seed("u0", 0.9);
    for (const cursor of ["not-base64!!", btoa("no-separator"), btoa("abc|not-a-uuid")]) {
      await expect(
        searchCreatorProfiles(db, { embedding: probe(), cursor }),
      ).rejects.toBeInstanceOf(ResonanceError);
    }
  });

  // ── Tag filtering ───────────────────────────────────────────────────────────────────────
  it("filters by tags conjunctively — a profile must carry every requested tag", async () => {
    const both = await seed("u0", 0.9, { tags: ["pottery", "ceramics"] });
    await seed("u1", 0.8, { tags: ["pottery"] });
    await seed("u2", 0.7, { tags: ["gamedev"] });

    const one = await searchCreatorProfiles(db, { embedding: probe(), tags: ["pottery"] });
    expect(one.results.map((r) => r.userId)).toEqual(["u0", "u1"]);

    const two = await searchCreatorProfiles(db, {
      embedding: probe(),
      tags: ["pottery", "ceramics"],
    });
    expect(two.results.map((r) => r.profileId)).toEqual([both.id]);

    const none = await searchCreatorProfiles(db, { embedding: probe(), tags: [] });
    expect(none.results).toHaveLength(3);
  });

  // Latent-hazard guard, not a today bug: only voyage-3.5 writes creator_profile vectors right
  // now. But the embeddings unique index is (source_type, source_id, model), so a second model
  // would join one creator to two rows — and two rows sharing a profile id defeat the `id`
  // pagination tiebreaker, silently skipping or repeating creators across pages.
  it("returns one row per creator even when a profile is embedded under several models", async () => {
    const profile = await seed("u0", 0.4);
    await upsertProfileEmbedding(db, {
      profileId: profile.id,
      model: "some-future-model",
      content: "c",
      embedding: vec(0.95),
    });
    await seed("u1", 0.7);

    const { results, nextCursor } = await searchCreatorProfiles(db, { embedding: probe() });

    expect(results.filter((r) => r.profileId === profile.id)).toHaveLength(1);
    // The best-matching model wins, so the profile ranks on its strongest embedding.
    expect(results[0]!.profileId).toBe(profile.id);
    expect(results[0]!.similarity).toBeCloseTo(0.95, 5);
    expect(nextCursor).toBeNull();
  });

  it("keeps pagination total-ordered across multi-model creators", async () => {
    const a = await seed("u0", 0.9);
    const b = await seed("u1", 0.8);
    const c = await seed("u2", 0.7);
    // Give every creator a second, weaker embedding — a duplicate-row bug would surface here as
    // a repeated or skipped id during the traversal.
    for (const p of [a, b, c]) {
      await upsertProfileEmbedding(db, {
        profileId: p.id,
        model: "some-future-model",
        content: "c",
        embedding: vec(0.1),
      });
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page: Awaited<ReturnType<typeof searchCreatorProfiles>> = await searchCreatorProfiles(
        db,
        { embedding: probe(), limit: 2, cursor },
      );
      seen.push(...page.results.map((r) => r.profileId));
      cursor = page.nextCursor;
    } while (cursor !== null);

    expect(seen).toEqual([a.id, b.id, c.id]);
  });

  it("excludes profiles that have no embedding row yet", async () => {
    await createCreatorProfile(db, {
      userId: "u0",
      displayName: "Unembedded",
      headline: "h",
      bio: "b",
      tags: [],
      offerings: [],
      status: "ready",
    });
    const embedded = await seed("u1", 0.5);

    const { results } = await searchCreatorProfiles(db, { embedding: probe() });
    expect(results.map((r) => r.profileId)).toEqual([embedded.id]);
  });

  // ── The adapter at the seam ─────────────────────────────────────────────────────────────
  describe("createDiscoveryAdapter", () => {
    /** Deterministic text→vector fake: the embedder is injected, never created (ADR-0018 DI). */
    const fakeEmbed = (byText: Record<string, number[]>) => async (text: string) => {
      const v = byText[text];
      if (!v) throw new Error(`fake embedder has no vector for ${JSON.stringify(text)}`);
      return v;
    };

    it("satisfies the port and returns a schema-valid creators page", async () => {
      const high = await seed("u0", 0.9, { tags: ["pottery"] });
      await seed("u1", 0.3);
      await followCreator(db, { followerId: "u5", followingId: "u0" });

      const port = createDiscoveryAdapter({
        db,
        embed: fakeEmbed({ "hand-thrown mugs": probe() }),
      });
      const query = CreatorDiscoveryQuerySchema.parse({ text: "hand-thrown mugs", limit: 1 });
      const page = await port.searchCreators(query, { userId: "u5" });

      expect(() => CreatorResultPageSchema.parse(page)).not.toThrow();
      expect(page.kind).toBe("creators");
      expect(page.results.map((r) => r.profileId)).toEqual([high.id]);
      expect(page.results[0]!.followState).toBe("following");
      expect(page.nextCursor).not.toBeNull();
    });

    it("passes the signed-out viewer through as unknown follow state", async () => {
      await seed("u0", 0.9);
      const port = createDiscoveryAdapter({ db, embed: fakeEmbed({ mugs: probe() }) });
      const page = await port.searchCreators(
        CreatorDiscoveryQuerySchema.parse({ text: "mugs" }),
        null,
      );
      expect(page.results[0]!.followState).toBe("unknown");
    });

    it("propagates a wrong-width embedding as a thrown error, not an empty page", async () => {
      await seed("u0", 0.9);
      const port = createDiscoveryAdapter({
        db,
        embed: fakeEmbed({ mugs: Array.from({ length: 10 }, () => 0.1) }),
      });
      await expect(
        port.searchCreators(CreatorDiscoveryQuerySchema.parse({ text: "mugs" }), null),
      ).rejects.toBeInstanceOf(EmbeddingDimensionError);
    });

    // Invariant 8 (Slice B, resonance-b149). Interest storage lands in resonance-e2d0; until
    // then no member has interests, so the contract's fallback is also the truthful answer.
    it("returns an empty page for a personalized query, without embedding anything", async () => {
      await seed("u0", 0.9);
      // This embedder throws for ANY text, so reaching it at all fails the test — which is
      // how we pin that `undefined` never gets handed to the embedder.
      const port = createDiscoveryAdapter({ db, embed: fakeEmbed({}) });

      for (const viewer of [null, { userId: "u5" }]) {
        const page = await port.searchCreators(CreatorDiscoveryQuerySchema.parse({}), viewer);
        expect(page.kind).toBe("creators");
        expect(page.results).toEqual([]);
        expect(page.nextCursor).toBeNull();
      }
    });
  });
});
