import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { user } from "../schema/auth";
import { createTestDb, type TestDb } from "../testing/create-test-db";
import { setUserRoles } from "./users";

const rolesOf = async (db: TestDb, id: string) => {
  const [row] = await db.select().from(user).where(eq(user.id, id)).limit(1);
  return row?.roles;
};

describe("setUserRoles", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await db.insert(user).values({ id: "u1", name: "Ada", email: "ada@x.com" });
  });
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
