import { afterEach, describe, expect, it, vi } from "vitest";

// The action touches server-only seams — mock the shell's session read and the composition root
// so the boundary (parse first, identity from the session, never from the payload) is tested
// without a database, a model or a cookie. Session reads go through `getWebSession`, which shares
// the auth mount's instance, so `lib/auth` is what gets mocked.
const getWebSession = vi.fn();
const transition = vi.fn();
const toClientView = vi.fn(async (view: object, _userId: string) => ({ ...view, profileId: null }));
const headers = vi.fn(async () => new Headers());
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("next/headers", () => ({ headers: () => headers() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("../../../../lib/auth", () => ({ getWebSession: (h: Headers) => getWebSession(h) }));
vi.mock("./onboarding", () => ({
  creatorOnboardingService: async () => ({ transition }),
  toClientView: (view: object, userId: string) => toClientView(view, userId),
}));

import { transitionCreatorOnboarding } from "./actions";

const sessionUser = { id: "user_1", email: "a@b.com", roles: ["member"] as const };
const command = { action: "begin", expectedRevision: 1, idempotencyKey: "key-12345678" };

afterEach(() => {
  vi.clearAllMocks();
});

describe("transitionCreatorOnboarding", () => {
  it("rejects a malformed command before reading the session", async () => {
    await expect(transitionCreatorOnboarding({ action: "revise_with_weave" })).rejects.toThrow();
    expect(getWebSession).not.toHaveBeenCalled();
    expect(transition).not.toHaveBeenCalled();
  });

  it("redirects anonymous callers to /signup", async () => {
    getWebSession.mockResolvedValueOnce(null);
    await expect(transitionCreatorOnboarding(command)).rejects.toThrow("NEXT_REDIRECT:/signup");
    expect(transition).not.toHaveBeenCalled();
  });

  it("acts for the session's creator and ignores any identity or version in the payload", async () => {
    getWebSession.mockResolvedValueOnce(sessionUser);
    transition.mockResolvedValueOnce({ status: "in_progress", revision: 2, notice: null });

    const view = await transitionCreatorOnboarding({
      ...command,
      userId: "someone_else",
      behaviorVersion: "weave-os-v9",
    });

    expect(transition).toHaveBeenCalledWith({ userId: "user_1" }, command);
    expect(toClientView).toHaveBeenCalledWith(expect.anything(), "user_1");
    expect(view).toMatchObject({ revision: 2, profileId: null });
  });
});
