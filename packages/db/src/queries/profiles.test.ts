import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { user } from "../schema/auth";
import { creatorProfiles } from "../schema/creator";
import { createTestDb, type TestDb } from "../testing/create-test-db";
import {
  createCreatorProfile,
  findSimilarProfiles,
  getCreatorProfileById,
  upsertProfileEmbedding,
} from "./profiles";

const unit = (i: number) => {
  const v = Array.from({ length: 1024 }, () => 0);
  v[i] = 1;
  return v;
};

describe("profile queries", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  // Generous hookTimeout: PGlite WASM cold-init + migrations is ~1s in isolation but can exceed the
  // 10s default under parallel test-suite CPU contention in CI (seed resonance-75e5).
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await db.insert(user).values([
      { id: "u1", name: "Ada", email: "ada@x.com" },
      { id: "u2", name: "Bo", email: "bo@x.com" },
    ]);
  }, 30000);
  afterEach(async () => {
    await close();
  });

  it("creates and reads back a profile", async () => {
    const created = await createCreatorProfile(db, {
      userId: "u1",
      displayName: "Ada",
      headline: "Maker",
      bio: "Builds tools.",
      tags: ["tools"],
      offerings: [],
      status: "ready",
    });
    const read = await getCreatorProfileById(db, created.id);
    expect(read?.displayName).toBe("Ada");
  });

  it("upserts on user_id — a second create for the same user updates in place", async () => {
    const first = await createCreatorProfile(db, {
      userId: "u1",
      displayName: "Ada",
      headline: "Maker",
      bio: "Builds tools.",
      tags: ["tools"],
      offerings: [],
      status: "ready",
    });
    const second = await createCreatorProfile(db, {
      userId: "u1",
      displayName: "Ada v2",
      headline: "Maker of tools",
      bio: "Still building.",
      tags: ["tools", "craft"],
      offerings: [],
      status: "ready",
    });

    expect(second.id).toBe(first.id);
    const rows = await db.select().from(creatorProfiles).where(eq(creatorProfiles.userId, "u1"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.displayName).toBe("Ada v2");
    expect(rows[0]?.headline).toBe("Maker of tools");
  });

  it("ranks profiles by cosine similarity to a query vector", async () => {
    const near = await createCreatorProfile(db, {
      userId: "u1",
      displayName: "Near",
      headline: "h",
      bio: "b",
      tags: [],
      offerings: [],
      status: "ready",
    });
    const far = await createCreatorProfile(db, {
      userId: "u2",
      displayName: "Far",
      headline: "h",
      bio: "b",
      tags: [],
      offerings: [],
      status: "ready",
    });
    await upsertProfileEmbedding(db, {
      profileId: near.id,
      model: "voyage-3.5",
      content: "n",
      embedding: unit(0),
    });
    await upsertProfileEmbedding(db, {
      profileId: far.id,
      model: "voyage-3.5",
      content: "f",
      embedding: unit(1),
    });

    const results = await findSimilarProfiles(db, unit(0), 10);
    expect(results[0]?.id).toBe(near.id);
    expect(results[0]!.similarity).toBeGreaterThan(results[1]!.similarity);
  });

  it("upsert replaces the embedding for the same (source, model)", async () => {
    const p = await createCreatorProfile(db, {
      userId: "u1",
      displayName: "P",
      headline: "h",
      bio: "b",
      tags: [],
      offerings: [],
      status: "ready",
    });
    await upsertProfileEmbedding(db, {
      profileId: p.id,
      model: "voyage-3.5",
      content: "v1",
      embedding: unit(0),
    });
    await upsertProfileEmbedding(db, {
      profileId: p.id,
      model: "voyage-3.5",
      content: "v2",
      embedding: unit(2),
    });
    const results = await findSimilarProfiles(db, unit(2), 10);
    expect(results.filter((r) => r.id === p.id)).toHaveLength(1);
    const match = results.find((r) => r.id === p.id);
    expect(match).toBeDefined();
    expect(match!.similarity).toBeCloseTo(1.0, 5);
  });
});
