import { describe, expect, it, vi } from "vitest";
import type { Auth } from "./auth";
import { getSession } from "./session";

/**
 * `getSession` reads through the Better Auth instance it is GIVEN, so the shell can point session
 * reads at the same instance that serves the auth mount — one instance per process (seed
 * resonance-eb15). These cases inject a minimal stub instance, so they never touch a live DB or the
 * app singleton.
 */
function stubAuth(session: unknown): { auth: Auth; getSessionSpy: ReturnType<typeof vi.fn> } {
  const getSessionSpy = vi.fn(async () => session);
  const auth = { api: { getSession: getSessionSpy } } as unknown as Auth;
  return { auth, getSessionSpy };
}

describe("getSession(headers, auth) — reads from the injected instance", () => {
  it("decodes the SessionUser from the passed instance", async () => {
    const { auth } = stubAuth({ user: { id: "u1", email: "a@b.com", roles: "member,creator" } });
    const user = await getSession(new Headers(), auth);
    expect(user).toEqual({ id: "u1", email: "a@b.com", roles: ["member", "creator"] });
  });

  it("returns null when the instance reports no session", async () => {
    const { auth } = stubAuth(null);
    expect(await getSession(new Headers(), auth)).toBeNull();
  });

  it("forwards the request headers to the injected instance", async () => {
    const { auth, getSessionSpy } = stubAuth(null);
    const headers = new Headers({ cookie: "better-auth.session_token=abc" });
    await getSession(headers, auth);
    expect(getSessionSpy).toHaveBeenCalledWith({ headers });
  });

  it("decodes an empty roles column to an empty list", async () => {
    const { auth } = stubAuth({ user: { id: "u2", email: "c@d.com", roles: "" } });
    const user = await getSession(new Headers(), auth);
    expect(user).toEqual({ id: "u2", email: "c@d.com", roles: [] });
  });
});
