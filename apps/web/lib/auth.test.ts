import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getWebSession` must read the session through the SAME Better Auth instance the auth mount serves
 * (`getWebAuth`), so exactly ONE instance runs per process (seed resonance-eb15). We mock the
 * package seams so the test needs no live DB or credentials; the assertions pin *which* instance
 * the read is routed through.
 */
const getSession = vi.fn();
const getAuth = vi.fn();
const createAuth = vi.fn();
const createDb = vi.fn(() => ({ __db: true }));
const harnessMailOverride = vi.fn();

vi.mock("@resonance/auth", () => ({
  getSession: (h: Headers, auth: unknown) => getSession(h, auth),
  getAuth: () => getAuth(),
  createAuth: (opts: unknown) => createAuth(opts),
}));
vi.mock("@resonance/db", () => ({ createDb: () => createDb() }));
vi.mock("./e2e-harness", () => ({ harnessMailOverride: () => harnessMailOverride() }));

import { getWebSession } from "./auth";

// The harness instance is pinned here (globalThis) so it's shared across Next.js module scopes;
// clear it around each case so the "built at most once" state is deterministic per test.
const HARNESS_AUTH_KEY = "__resonance_web_harness_auth__";
function clearHarnessAuth() {
  delete (globalThis as Record<string, unknown>)[HARNESS_AUTH_KEY];
}

beforeEach(() => {
  vi.clearAllMocks();
  clearHarnessAuth();
});
afterEach(clearHarnessAuth);

describe("getWebSession — session reads run through the mount's instance (seed resonance-eb15)", () => {
  it("reads through the live getAuth() singleton when the harness is inactive", async () => {
    const liveInstance = { __live: true };
    getAuth.mockReturnValue(liveInstance);
    harnessMailOverride.mockResolvedValueOnce(undefined);
    getSession.mockResolvedValueOnce({ id: "u1", email: "a@b.com", roles: ["member"] });

    const headers = new Headers();
    const user = await getWebSession(headers);

    expect(user).toEqual({ id: "u1", email: "a@b.com", roles: ["member"] });
    // The read used the SAME instance the mount serves — the live singleton — not a second one.
    expect(getSession).toHaveBeenCalledWith(headers, liveInstance);
    expect(createAuth).not.toHaveBeenCalled();
  });

  it("reads through the isolated harness instance when the harness is active", async () => {
    const harnessMail = { sendMagicLink: vi.fn(), sendLoginCode: vi.fn() };
    const harnessInstance = { __harness: true };
    harnessMailOverride.mockResolvedValue(harnessMail);
    createAuth.mockReturnValue(harnessInstance);
    getSession.mockResolvedValueOnce(null);

    await getWebSession(new Headers());

    // Under the harness, reads go through the createAuth({ db, mail }) instance — not getAuth().
    expect(createAuth).toHaveBeenCalledWith({ db: { __db: true }, mail: harnessMail });
    expect(getSession).toHaveBeenCalledWith(expect.any(Headers), harnessInstance);
    expect(getAuth).not.toHaveBeenCalled();
  });

  it("builds the harness instance at most once across calls (one instance per process)", async () => {
    harnessMailOverride.mockResolvedValue({ sendMagicLink: vi.fn(), sendLoginCode: vi.fn() });
    createAuth.mockReturnValue({ __harness: true });
    getSession.mockResolvedValue(null);

    await getWebSession(new Headers());
    await getWebSession(new Headers());

    expect(createAuth).toHaveBeenCalledTimes(1);
  });
});
