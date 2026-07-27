import { eq } from "drizzle-orm";
import { ResonanceError } from "@resonance/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { follows } from "../schema/community";
import { user } from "../schema/auth";
import { createTestDb, type TestDb } from "../testing/create-test-db";
import { followCreator, getFollowStates, unfollowCreator } from "./follows";

describe("follow graph", () => {
  let db: TestDb;
  let close: () => Promise<void>;

  // Generous hookTimeout: PGlite WASM cold-init + migrations is ~1s in isolation but can exceed the
  // 10s default under parallel test-suite CPU contention in CI (seed resonance-75e5).
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await db.insert(user).values([
      { id: "ada", name: "Ada", email: "ada@x.com" },
      { id: "bo", name: "Bo", email: "bo@x.com" },
      { id: "cy", name: "Cy", email: "cy@x.com" },
    ]);
  }, 30000);
  afterEach(async () => {
    await close();
  });

  it("round-trips follow → state → unfollow → state", async () => {
    await expect(getFollowStates(db, "ada", ["bo"])).resolves.toEqual(
      new Map([["bo", "not_following"]]),
    );

    await followCreator(db, { followerId: "ada", followingId: "bo" });
    await expect(getFollowStates(db, "ada", ["bo"])).resolves.toEqual(
      new Map([["bo", "following"]]),
    );

    await unfollowCreator(db, { followerId: "ada", followingId: "bo" });
    await expect(getFollowStates(db, "ada", ["bo"])).resolves.toEqual(
      new Map([["bo", "not_following"]]),
    );
  });

  it("is idempotent in both directions", async () => {
    await followCreator(db, { followerId: "ada", followingId: "bo" });
    await followCreator(db, { followerId: "ada", followingId: "bo" });
    expect(await db.select().from(follows)).toHaveLength(1);

    await unfollowCreator(db, { followerId: "ada", followingId: "bo" });
    await unfollowCreator(db, { followerId: "ada", followingId: "bo" });
    expect(await db.select().from(follows)).toHaveLength(0);
  });

  it("rejects self-follows with a typed error", async () => {
    await expect(
      followCreator(db, { followerId: "ada", followingId: "ada" }),
    ).rejects.toBeInstanceOf(ResonanceError);
    await expect(
      followCreator(db, { followerId: "ada", followingId: "ada" }),
    ).rejects.toMatchObject({ code: "follow_self" });
    expect(await db.select().from(follows)).toHaveLength(0);
  });

  it("is directed — Ada following Bo does not make Bo follow Ada", async () => {
    await followCreator(db, { followerId: "ada", followingId: "bo" });
    await expect(getFollowStates(db, "bo", ["ada"])).resolves.toEqual(
      new Map([["ada", "not_following"]]),
    );
  });

  it("resolves a whole page of ids in one call", async () => {
    await followCreator(db, { followerId: "ada", followingId: "bo" });
    const states = await getFollowStates(db, "ada", ["bo", "cy", "ada"]);
    expect(states).toEqual(
      new Map([
        ["bo", "following"],
        ["cy", "not_following"],
        ["ada", "not_following"],
      ]),
    );
  });

  it("reports unknown for every id when the viewer is signed out", async () => {
    await followCreator(db, { followerId: "ada", followingId: "bo" });
    const states = await getFollowStates(db, null, ["bo", "cy"]);
    expect(states).toEqual(
      new Map([
        ["bo", "unknown"],
        ["cy", "unknown"],
      ]),
    );
  });

  it("returns an empty map for an empty id list", async () => {
    await expect(getFollowStates(db, "ada", [])).resolves.toEqual(new Map());
    await expect(getFollowStates(db, null, [])).resolves.toEqual(new Map());
  });

  it("cascades: deleting a user removes their edges in both directions", async () => {
    await followCreator(db, { followerId: "ada", followingId: "bo" });
    await followCreator(db, { followerId: "cy", followingId: "ada" });
    expect(await db.select().from(follows)).toHaveLength(2);

    await db.delete(user).where(eq(user.id, "ada"));
    expect(await db.select().from(follows)).toHaveLength(0);
  });
});
