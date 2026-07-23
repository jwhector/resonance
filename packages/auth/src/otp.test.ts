// packages/auth/src/otp.test.ts
// Proves the emailOTP capability coexists with magic-link on one auth instance:
// a 6-digit code is sent through the fake mail transport and verifies to a signed-in
// user, while the magic-link path remains configured and functional.
import { createTestDb, type TestDb } from "@resonance/db/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuth } from "./auth";
import { decodeRoles } from "./roles";
import { createFakeMail } from "./testing/fake-mail";

describe("emailOTP auth (PGlite-backed)", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
  });
  afterEach(async () => {
    await close();
  });

  it("sends a 6-digit code through the fake transport and signs the user in", async () => {
    const mail = createFakeMail();
    const auth = createAuth({
      db,
      mail: mail.port,
      secret: "test-secret",
      baseURL: "http://localhost:3000",
    });

    // 1. request a login code (no email leaves the process)
    await auth.api.sendVerificationOTP({
      body: { email: "code@user.com", type: "sign-in" },
      headers: new Headers(),
    });

    // the fake captured the code — and the magic-link path was untouched
    expect(mail.codes).toHaveLength(1);
    expect(mail.sent).toHaveLength(0);
    const captured = mail.codes[0]!;
    expect(captured.email).toBe("code@user.com");
    expect(captured.type).toBe("sign-in");
    expect(captured.otp).toMatch(/^\d{6}$/);

    // 2. sign in with the captured code -> creates the user + session
    const res = await auth.api.signInEmailOTP({
      body: { email: "code@user.com", otp: captured.otp },
      headers: new Headers(),
    });
    expect(res.token).toBeTruthy();

    // 3. the user now exists with default roles
    const rows = await db.query.user.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe("code@user.com");
    expect(decodeRoles(rows[0]?.roles)).toEqual(["member"]);
  });

  it("rejects a wrong code without creating a user", async () => {
    const mail = createFakeMail();
    const auth = createAuth({
      db,
      mail: mail.port,
      secret: "test-secret",
      baseURL: "http://localhost:3000",
    });

    await auth.api.sendVerificationOTP({
      body: { email: "code@user.com", type: "sign-in" },
      headers: new Headers(),
    });
    expect(mail.codes).toHaveLength(1);

    await expect(
      auth.api.signInEmailOTP({
        body: { email: "code@user.com", otp: "000000" },
        headers: new Headers(),
      }),
    ).rejects.toThrow();

    const rows = await db.query.user.findMany();
    expect(rows).toHaveLength(0);
  });

  it("keeps magic-link working on the same instance (both plugins coexist)", async () => {
    const mail = createFakeMail();
    const auth = createAuth({
      db,
      mail: mail.port,
      secret: "test-secret",
      baseURL: "http://localhost:3000",
    });

    // magic-link send still dispatches through the same transport
    await auth.api.signInMagicLink({
      body: { email: "link@user.com", callbackURL: "/" },
      headers: new Headers(),
    });
    expect(mail.sent).toHaveLength(1);
    expect(mail.codes).toHaveLength(0);

    // and the emailOTP send works independently on the same instance
    await auth.api.sendVerificationOTP({
      body: { email: "link@user.com", type: "sign-in" },
      headers: new Headers(),
    });
    expect(mail.codes).toHaveLength(1);
    expect(mail.sent).toHaveLength(1);
  });
});
