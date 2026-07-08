import { type CommitProfileInput } from "@resonance/core";
import {
  creatorProfiles,
  embeddings,
  findSimilarProfiles,
  getCreatorProfileById,
  user,
} from "@resonance/db";
import { createTestDb, type TestDb } from "@resonance/db/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFakeEmbedder, type Embedder } from "../../embeddings";
import { commitCreatorProfile } from "./commit-profile";

const commit: CommitProfileInput = {
  displayName: "Ada",
  headline: "Maker of small tools",
  bio: "I build things that fit the hand, for people who make with their hands.",
  tags: ["tools", "craft"],
};

/** Wrap the deterministic fake embedder to record when the (external, fail-safe-first) embed runs. */
function recordingEmbedder(order: string[]): Embedder {
  const base = createFakeEmbedder();
  return {
    model: base.model,
    embed: (text) => base.embed(text),
    embedProfile: async (profile) => {
      order.push("embed");
      return base.embedProfile(profile);
    },
  };
}

/** Spy on the injected Db's write entry points (insert/update) to record their call order. */
function recordingDb(db: TestDb, order: string[]): TestDb {
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === "insert") {
        return (table: unknown) => {
          order.push(table === creatorProfiles ? "create-profile" : "upsert-embedding");
          return target.insert(table as Parameters<TestDb["insert"]>[0]);
        };
      }
      if (prop === "update") {
        return (table: unknown) => {
          order.push("set-roles");
          return target.update(table as Parameters<TestDb["update"]>[0]);
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  }) as TestDb;
}

describe("commitCreatorProfile (PGlite + fake embedder)", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await db.insert(user).values({ id: "u1", name: "Ada", email: "ada@x.com" });
  });
  afterEach(async () => {
    await close();
  });

  it("persists the profile with status ready and offerings defaulting to []", async () => {
    const { profileId } = await commitCreatorProfile(
      { userId: "u1", currentRoles: ["member"], db, embedder: createFakeEmbedder() },
      commit,
    );
    expect(profileId).toBeTruthy();

    const row = await getCreatorProfileById(db, profileId);
    expect(row?.displayName).toBe("Ada");
    expect(row?.headline).toBe("Maker of small tools");
    expect(row?.tags).toEqual(["tools", "craft"]);
    expect(row?.offerings).toEqual([]);
    expect(row?.status).toBe("ready");
    expect(row?.userId).toBe("u1");
  });

  it("adds the creator role ADDITIVELY — a member becomes member+creator", async () => {
    await commitCreatorProfile(
      { userId: "u1", currentRoles: ["member"], db, embedder: createFakeEmbedder() },
      commit,
    );
    const rows = await db.select().from(user);
    expect(rows.find((r) => r.id === "u1")?.roles).toBe("member,creator");
  });

  it("embeds the profile so the matching backbone finds it (ADR-0010)", async () => {
    const { profileId } = await commitCreatorProfile(
      { userId: "u1", currentRoles: ["member"], db, embedder: createFakeEmbedder() },
      commit,
    );

    // Re-embed the same committed content (offerings []) and query — the deterministic fake makes
    // it the top hit.
    const embedder = createFakeEmbedder();
    const { embedding } = await embedder.embedProfile({ ...commit, offerings: [] });
    const results = await findSimilarProfiles(db, embedding);

    expect(results[0]?.id).toBe(profileId);
    expect(results[0]?.similarity).toBeGreaterThan(0.99);
  });

  it("runs embed → create profile → embedding → role flip, IN ORDER (role last)", async () => {
    const order: string[] = [];
    await commitCreatorProfile(
      {
        userId: "u1",
        currentRoles: ["member"],
        db: recordingDb(db, order),
        embedder: recordingEmbedder(order),
      },
      commit,
    );
    expect(order).toEqual(["embed", "create-profile", "upsert-embedding", "set-roles"]);
    expect(order.at(-1)).toBe("set-roles");
  });

  it("is idempotent — a second commit updates in place, no duplicate profile", async () => {
    const ctx = {
      userId: "u1",
      currentRoles: ["member"] as const,
      db,
      embedder: createFakeEmbedder(),
    };
    const first = await commitCreatorProfile({ ...ctx, currentRoles: ["member"] }, commit);
    const second = await commitCreatorProfile({ ...ctx, currentRoles: ["member"] }, commit);

    expect(second.profileId).toBe(first.profileId);
    const rows = await db.select().from(creatorProfiles);
    expect(rows.filter((r) => r.userId === "u1")).toHaveLength(1);
  });

  it("throws on invalid input and writes nothing", async () => {
    await expect(
      commitCreatorProfile(
        { userId: "u1", currentRoles: ["member"], db, embedder: createFakeEmbedder() },
        // Empty displayName violates the shared CommitProfileInput contract.
        { ...commit, displayName: "" },
      ),
    ).rejects.toThrow();

    expect(await db.select().from(creatorProfiles)).toHaveLength(0);
    expect(await db.select().from(embeddings)).toHaveLength(0);
  });
});
