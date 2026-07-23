// packages/auth/src/auth.test.ts
import { createTestDb, type TestDb } from "@resonance/db/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuth } from "./auth";
import { decodeRoles } from "./roles";
import { createFakeMail } from "./testing/fake-mail";

describe("magic-link auth (PGlite-backed)", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
  });
  afterEach(async () => {
    await close();
  });

  it("signs a new user in via magic link and defaults roles to member", async () => {
    const mail = createFakeMail();
    const auth = createAuth({
      db,
      mail: mail.port,
      secret: "test-secret",
      baseURL: "http://localhost:3000",
    });

    // 1. request the link (no email leaves the process)
    await auth.api.signInMagicLink({
      body: { email: "new@user.com", callbackURL: "/" },
      headers: new Headers(),
    });
    expect(mail.sent).toHaveLength(1);
    const token = mail.sent[0]!.token;

    // 2. verify the token -> creates the user + session
    await auth.api.magicLinkVerify({ query: { token }, headers: new Headers() });

    // 3. the user now exists with default roles
    const rows = await db.query.user.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe("new@user.com");
    expect(decodeRoles(rows[0]?.roles)).toEqual(["member"]);
  });
});
