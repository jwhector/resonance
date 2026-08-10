import { and, eq } from "drizzle-orm";
import {
  EMBEDDING_DIMS,
  MemberInterestsSchema,
  ResonanceError,
  TopicSchema,
  type Topic,
} from "@resonance/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { user } from "../schema/auth";
import { embeddings } from "../schema/creator";
import { memberInterests } from "../schema/interests";
import { createTestDb, type TestDb } from "../testing/create-test-db";
import {
  getMemberInterestEmbedding,
  getMemberInterests,
  listTopics,
  setMemberInterests,
  type InterestEmbedder,
} from "./interests";

/**
 * Member interests against real Postgres (PGlite), through the same exports the web layer calls.
 *
 * The curated taxonomy is seeded by migration `0006_seed_topics`, so `createTestDb()` — which
 * applies every real migration — gives these tests the same 13 topics production has. That is
 * deliberate: a test that seeded its own topics would not notice the seed migration breaking.
 */

const DESIGN_TOPIC_SLUGS = [
  "wellness",
  "herbalism",
  "art",
  "music",
  "meditation",
  "spirituality",
  "design",
  "nature",
  "community",
  "writing",
  "workshops",
  "philosophy",
  "tea-culture",
];

/** A distinct unit vector per label, so "which content was embedded" is visible in the vector. */
function vec(seed: number): number[] {
  const v = Array.from({ length: EMBEDDING_DIMS }, () => 0);
  v[seed % EMBEDDING_DIMS] = 1;
  return v;
}

/** The injected embedder, as the app layer supplies it — `resolveEmbedder()` fits this shape. */
function fakeEmbedder(model = "voyage-3.5"): InterestEmbedder & { calls: string[] } {
  const calls: string[] = [];
  return {
    model,
    calls,
    async embed(text: string) {
      calls.push(text);
      return vec(text.length);
    },
  };
}

describe("member interests", () => {
  let db: TestDb;
  let close: () => Promise<void>;

  // Generous hookTimeout: PGlite WASM cold-init + migrations can exceed the 10s default under
  // parallel test-suite CPU contention in CI.
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await db
      .insert(user)
      .values(
        Array.from({ length: 3 }, (_, i) => ({ id: `m${i}`, name: `M${i}`, email: `m${i}@x.com` })),
      );
  }, 30000);
  afterEach(async () => {
    await close();
  });

  // ── The curated taxonomy ────────────────────────────────────────────────────────────────
  describe("listTopics", () => {
    it("returns the design's 13 unique topics in the frame's order", async () => {
      const rows = await listTopics(db);
      expect(rows.map((t) => t.slug)).toEqual(DESIGN_TOPIC_SLUGS);
      // The frame draws "Art" twice; the seed carries 13 unique topics, not 14 rows.
      expect(new Set(rows.map((t) => t.slug)).size).toBe(13);
    });

    it("returns rows that satisfy core's Topic contract", async () => {
      for (const row of await listTopics(db)) {
        expect(() => TopicSchema.parse(row)).not.toThrow();
      }
      const labels = (await listTopics(db)).map((t) => t.label);
      expect(labels).toContain("Tea Culture");
    });
  });

  // ── Writing a selection ─────────────────────────────────────────────────────────────────
  describe("setMemberInterests", () => {
    it("persists a selection and reads it back in the taxonomy's order", async () => {
      const embedder = fakeEmbedder();
      // Submitted out of order on purpose — the read is ordered by the taxonomy, not by insert.
      await setMemberInterests(db, {
        memberId: "m0",
        topicSlugs: ["tea-culture", "art", "wellness"],
        embedder,
      });

      const picked = await getMemberInterests(db, "m0");
      expect(picked.map((t) => t.slug)).toEqual(["wellness", "art", "tea-culture"]);
      expect(picked.map((t) => t.label)).toEqual(["Wellness", "Art", "Tea Culture"]);
    });

    it("embeds the LABELS, not the slugs, so the vector shares the creator side's vocabulary", async () => {
      const embedder = fakeEmbedder();
      await setMemberInterests(db, { memberId: "m0", topicSlugs: ["tea-culture"], embedder });

      expect(embedder.calls).toEqual(["Tea Culture"]);
      const [row] = await db
        .select({ content: embeddings.content, model: embeddings.model })
        .from(embeddings)
        .where(and(eq(embeddings.sourceType, "interest"), eq(embeddings.sourceId, "m0")));
      expect(row).toEqual({ content: "Tea Culture", model: "voyage-3.5" });
    });

    it("stores exactly one interest vector, keyed to the USER id, at the profile width", async () => {
      await setMemberInterests(db, {
        memberId: "m0",
        topicSlugs: ["art", "music"],
        embedder: fakeEmbedder(),
      });

      const rows = await db
        .select({ sourceId: embeddings.sourceId, embedding: embeddings.embedding })
        .from(embeddings)
        .where(eq(embeddings.sourceType, "interest"));
      expect(rows).toHaveLength(1);
      // A Better Auth user id is text, not a uuid — this is the whole reason source_id widened.
      expect(rows[0]!.sourceId).toBe("m0");
      expect(rows[0]!.embedding).toHaveLength(EMBEDDING_DIMS);
    });

    it("orders the embedded content by the taxonomy, so the same selection is a no-op", async () => {
      const first = fakeEmbedder();
      await setMemberInterests(db, {
        memberId: "m0",
        topicSlugs: ["art", "wellness"],
        embedder: first,
      });
      const second = fakeEmbedder();
      await setMemberInterests(db, {
        memberId: "m0",
        topicSlugs: ["wellness", "art"],
        embedder: second,
      });

      expect(first.calls).toEqual(["Wellness, Art"]);
      expect(second.calls).toEqual(["Wellness, Art"]);
      expect(await getMemberInterestEmbedding(db, "m0")).toEqual(vec("Wellness, Art".length));
    });

    it("REPLACES the previous selection rather than merging with it", async () => {
      const embedder = fakeEmbedder();
      await setMemberInterests(db, {
        memberId: "m0",
        topicSlugs: ["art", "music", "nature"],
        embedder,
      });
      await setMemberInterests(db, { memberId: "m0", topicSlugs: ["music", "design"], embedder });

      expect((await getMemberInterests(db, "m0")).map((t) => t.slug)).toEqual(["music", "design"]);
      const [row] = await db
        .select({ content: embeddings.content })
        .from(embeddings)
        .where(and(eq(embeddings.sourceType, "interest"), eq(embeddings.sourceId, "m0")));
      expect(row!.content).toBe("Music, Design");
    });

    it("keeps one member's selection out of another's", async () => {
      const embedder = fakeEmbedder();
      await setMemberInterests(db, { memberId: "m0", topicSlugs: ["art"], embedder });
      await setMemberInterests(db, { memberId: "m1", topicSlugs: ["music", "nature"], embedder });

      expect((await getMemberInterests(db, "m0")).map((t) => t.slug)).toEqual(["art"]);
      expect((await getMemberInterests(db, "m1")).map((t) => t.slug)).toEqual(["music", "nature"]);
    });

    it("leaves exactly one interest vector when the embedding model changes", async () => {
      await setMemberInterests(db, {
        memberId: "m0",
        topicSlugs: ["art"],
        embedder: fakeEmbedder("voyage-3.5"),
      });
      await setMemberInterests(db, {
        memberId: "m0",
        topicSlugs: ["art"],
        embedder: fakeEmbedder("voyage-4"),
      });

      const rows = await db
        .select({ model: embeddings.model })
        .from(embeddings)
        .where(and(eq(embeddings.sourceType, "interest"), eq(embeddings.sourceId, "m0")));
      expect(rows.map((r) => r.model)).toEqual(["voyage-4"]);
    });

    // ── Skipping is a supported outcome, not a failed write ───────────────────────────────
    it("records an empty selection as 'no interests', without calling the embedder", async () => {
      const embedder = fakeEmbedder();
      await setMemberInterests(db, { memberId: "m0", topicSlugs: [], embedder });

      expect(embedder.calls).toEqual([]);
      expect(await getMemberInterests(db, "m0")).toEqual([]);
      expect(await getMemberInterestEmbedding(db, "m0")).toBeNull();
    });

    it("clears a previous selection AND its vector when the member picks nothing", async () => {
      const embedder = fakeEmbedder();
      await setMemberInterests(db, { memberId: "m0", topicSlugs: ["art", "music"], embedder });
      await setMemberInterests(db, { memberId: "m0", topicSlugs: [], embedder });

      expect(await getMemberInterests(db, "m0")).toEqual([]);
      // The vector must go too — a stale one would keep personalizing off interests the member
      // has explicitly dropped.
      expect(await getMemberInterestEmbedding(db, "m0")).toBeNull();
    });

    it("accepts the empty payload MemberInterestsSchema produces for a skipped picker", async () => {
      const parsed = MemberInterestsSchema.parse({});
      await setMemberInterests(db, {
        memberId: "m0",
        topicSlugs: parsed.topicSlugs,
        embedder: fakeEmbedder(),
      });
      expect(await getMemberInterests(db, "m0")).toEqual([]);
    });

    // ── Failure modes ────────────────────────────────────────────────────────────────────
    it("rejects an unknown slug with a typed error, not an opaque FK violation", async () => {
      const embedder = fakeEmbedder();
      await expect(
        setMemberInterests(db, { memberId: "m0", topicSlugs: ["art", "cryptocurrency"], embedder }),
      ).rejects.toBeInstanceOf(ResonanceError);
      // Nothing was written and nothing was embedded — the check precedes both.
      expect(embedder.calls).toEqual([]);
      expect(await getMemberInterests(db, "m0")).toEqual([]);
    });

    it("leaves storage untouched when the embedder fails", async () => {
      const embedder = fakeEmbedder();
      await setMemberInterests(db, { memberId: "m0", topicSlugs: ["art"], embedder });

      const broken: InterestEmbedder = {
        model: "voyage-3.5",
        embed: vi.fn().mockRejectedValue(new Error("provider down")),
      };
      await expect(
        setMemberInterests(db, { memberId: "m0", topicSlugs: ["music"], embedder: broken }),
      ).rejects.toThrow("provider down");

      // Embedding happens before either write, so the old selection is intact rather than half
      // replaced by one that has no vector.
      expect((await getMemberInterests(db, "m0")).map((t) => t.slug)).toEqual(["art"]);
      expect(await getMemberInterestEmbedding(db, "m0")).not.toBeNull();
    });

    it("takes the member's interests with them when the member is deleted", async () => {
      await setMemberInterests(db, {
        memberId: "m0",
        topicSlugs: ["art"],
        embedder: fakeEmbedder(),
      });
      await db.delete(user).where(eq(user.id, "m0"));

      const rows = await db.select().from(memberInterests);
      expect(rows).toEqual([]);
    });
  });

  // ── Reading back ────────────────────────────────────────────────────────────────────────
  describe("getMemberInterests / getMemberInterestEmbedding", () => {
    it("returns nothing for a member who never touched the picker", async () => {
      const picked: Topic[] = await getMemberInterests(db, "m2");
      expect(picked).toEqual([]);
      expect(await getMemberInterestEmbedding(db, "m2")).toBeNull();
    });

    it("does not mistake a creator-profile vector for an interest vector", async () => {
      // Both source types share one table; the read must be keyed on source_type as well as id.
      await db.insert(embeddings).values({
        sourceType: "creator_profile",
        sourceId: "m0",
        model: "voyage-3.5",
        content: "a profile, not an interest",
        embedding: vec(7),
      });
      expect(await getMemberInterestEmbedding(db, "m0")).toBeNull();
    });
  });
});
