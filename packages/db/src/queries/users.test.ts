import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { user } from "../schema/auth";
import { createTestDb, type TestDb } from "../testing/create-test-db";
import { setOnboardingIntent, setUserRoles } from "./users";

const rowOf = async (db: TestDb, id: string) => {
  const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  return row;
};

const rolesOf = async (db: TestDb, id: string) => (await rowOf(db, id))?.roles;
const intentOf = async (db: TestDb, id: string) => (await rowOf(db, id))?.onboardingIntent;

describe("setUserRoles", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  // Generous hookTimeout: PGlite WASM cold-init + migrations is ~1s in isolation but can exceed the
  // 10s default under parallel test-suite CPU contention in CI.
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await db.insert(user).values({ id: "u1", name: "Ada", email: "ada@x.com" });
  }, 30000);
  afterEach(async () => {
    await close();
  });

  it("flips a member into a member+creator (comma-encoded)", async () => {
    await setUserRoles(db, "u1", ["member", "creator"]);
    expect(await rolesOf(db, "u1")).toBe("member,creator");
  });

  it("deduplicates repeated roles", async () => {
    await setUserRoles(db, "u1", ["member", "creator", "member"]);
    expect(await rolesOf(db, "u1")).toBe("member,creator");
  });

  it("overwrites, so a role can be dropped", async () => {
    await setUserRoles(db, "u1", ["member", "creator"]);
    await setUserRoles(db, "u1", ["creator"]);
    expect(await rolesOf(db, "u1")).toBe("creator");
  });

  it("only touches the target user", async () => {
    await db.insert(user).values({ id: "u2", name: "Bo", email: "bo@x.com" });
    await setUserRoles(db, "u1", ["creator"]);
    expect(await rolesOf(db, "u2")).toBe("member");
  });
});

describe("setOnboardingIntent", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  // Generous hookTimeout: PGlite WASM cold-init + migrations is ~1s in isolation but can exceed the
  // 10s default under parallel test-suite CPU contention in CI.
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await db.insert(user).values({ id: "u1", name: "Ada", email: "ada@x.com" });
  }, 30000);
  afterEach(async () => {
    await close();
  });

  it("leaves the intent null for a user who never answered the question", async () => {
    expect(await intentOf(db, "u1")).toBeNull();
  });

  it("records a stated intent", async () => {
    await setOnboardingIntent(db, "u1", "share");
    expect(await intentOf(db, "u1")).toBe("share");
  });

  it("restating the same intent leaves the stored answer unchanged", async () => {
    await setOnboardingIntent(db, "u1", "explore");
    await setOnboardingIntent(db, "u1", "explore");
    expect(await intentOf(db, "u1")).toBe("explore");
  });

  it("overwrites, so a member converting to a creator restates their intent", async () => {
    await setOnboardingIntent(db, "u1", "explore");
    await setOnboardingIntent(db, "u1", "business");
    expect(await intentOf(db, "u1")).toBe("business");
  });

  it("rejects a value that is not an intent instead of storing it", async () => {
    await expect(
      // The web layer reads this off a URL and a form, so the unvalidated case is reachable.
      setOnboardingIntent(db, "u1", "creator" as never),
    ).rejects.toThrow();
    expect(await intentOf(db, "u1")).toBeNull();
  });

  it("does not change the user's role", async () => {
    await setOnboardingIntent(db, "u1", "business");
    expect(await rolesOf(db, "u1")).toBe("member");
  });

  it("only touches the target user", async () => {
    await db.insert(user).values({ id: "u2", name: "Bo", email: "bo@x.com" });
    await setOnboardingIntent(db, "u1", "share");
    expect(await intentOf(db, "u2")).toBeNull();
  });
});
