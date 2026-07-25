import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../testing/create-test-db";
import { creatorProfiles, embeddings } from "./creator";
import { user } from "./auth";

const vec = (fill: number) => Array.from({ length: 1024 }, () => fill);

describe("creator schema (PGlite + pgvector)", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  // Generous hookTimeout: PGlite WASM cold-init + migrations is ~1s in isolation but can exceed the
  // 10s default under parallel test-suite CPU contention in CI (seed resonance-75e5).
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
  }, 30000);
  afterEach(async () => {
    await close();
  });

  it("persists a profile and a 1024-dim embedding row", async () => {
    await db.insert(user).values({ id: "u1", name: "Ada", email: "ada@x.com" });
    const [profile] = await db
      .insert(creatorProfiles)
      .values({
        userId: "u1",
        displayName: "Ada",
        headline: "Maker of things",
        bio: "I build delightful tools.",
        tags: ["craft", "tools"],
        offerings: [{ title: "Workshop", description: "A hands-on session." }],
        status: "ready",
      })
      .returning();
    expect(profile?.id).toBeTruthy();
    expect(profile?.tags).toEqual(["craft", "tools"]);

    await db.insert(embeddings).values({
      sourceType: "creator_profile",
      sourceId: profile!.id,
      model: "voyage-3.5",
      content: "Ada — Maker of things",
      embedding: vec(0.1),
    });

    const rows = await db
      .select()
      .from(embeddings)
      .where(eq(embeddings.sourceType, "creator_profile"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.embedding).toHaveLength(1024);

    // the pgvector cosine-distance operator returns ~1.0 for orthogonal unit vectors
    const probe = await db.execute<{ d: string }>(
      sql`select ('[1,0,0]'::vector <=> '[0,1,0]'::vector)::text as d`,
    );
    expect(Number(probe.rows[0]!.d)).toBeCloseTo(1.0);
  });
});
