import type { CreatorProfileDraft } from "@resonance/core";
import { afterEach, describe, expect, it, vi } from "vitest";

// The action modules touch server-only seams — mock each package's public entrypoint so we can
// unit-test the boundary validation + wiring without a live DB, AI Gateway, or session cookie.
// Session reads go through the shell's `getWebSession` (which routes through the SAME instance the
// auth mount serves — seed resonance-eb15), so we mock `lib/auth`, not `@resonance/auth` directly.
const getWebSession = vi.fn();
const runAgentStructured = vi.fn();
const commitCreatorProfile = vi.fn();
const resolveEmbedder = vi.fn(() => ({ embedProfile: vi.fn() }));
const createDb = vi.fn(() => ({ __db: true }));
const headers = vi.fn(async () => new Headers());
const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

vi.mock("next/headers", () => ({ headers: () => headers() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("../../../lib/auth", () => ({ getWebSession: (h: Headers) => getWebSession(h) }));
vi.mock("@resonance/db", () => ({ createDb: () => createDb() }));
vi.mock("@resonance/ai", () => ({
  profileGenAgent: { id: "profile-gen" },
  runAgentStructured: (agent: unknown, input: unknown) => runAgentStructured(agent, input),
  commitCreatorProfile: (ctx: unknown, input: unknown) => commitCreatorProfile(ctx, input),
  resolveEmbedder: () => resolveEmbedder(),
}));

import { commitProfile, generateDraft } from "./actions";

const draft: CreatorProfileDraft = {
  nameOptions: [{ name: "Ada", description: "Her own name — personal and direct." }],
  headline: "Maker of small tools",
  bio: "I build things that fit the hand.",
  tags: ["tools", "craft"],
};

const sessionUser = { id: "user_1", email: "a@b.com", roles: ["member"] as const };

afterEach(() => {
  vi.clearAllMocks();
});

describe("generateDraft", () => {
  it("rejects an empty transcript at the Zod boundary (before any session/AI call)", async () => {
    await expect(generateDraft({ messages: [] })).rejects.toThrow();
    expect(getWebSession).not.toHaveBeenCalled();
    expect(runAgentStructured).not.toHaveBeenCalled();
  });

  it("rejects a malformed message payload", async () => {
    await expect(generateDraft({ messages: [{ role: "bogus", content: "x" }] })).rejects.toThrow();
    expect(runAgentStructured).not.toHaveBeenCalled();
  });

  it("redirects anonymous callers to /signup", async () => {
    getWebSession.mockResolvedValueOnce(null);
    await expect(generateDraft({ messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(
      "NEXT_REDIRECT:/signup",
    );
    expect(runAgentStructured).not.toHaveBeenCalled();
  });

  it("returns the generated draft for an authenticated creator", async () => {
    getWebSession.mockResolvedValueOnce(sessionUser);
    runAgentStructured.mockResolvedValueOnce({ output: draft, text: "" });

    const result = await generateDraft({ messages: [{ role: "user", content: "I make tools" }] });

    expect(result).toEqual(draft);
    // Live-by-default: no injected model — the runner resolves the Gateway model itself.
    expect(runAgentStructured).toHaveBeenCalledWith(
      { id: "profile-gen" },
      { messages: [{ role: "user", content: "I make tools" }] },
    );
  });
});

describe("commitProfile", () => {
  it("rejects an invalid commit payload at the Zod boundary", async () => {
    await expect(
      commitProfile({ displayName: "", headline: "h", bio: "b", tags: [] }),
    ).rejects.toThrow();
    expect(getWebSession).not.toHaveBeenCalled();
    expect(commitCreatorProfile).not.toHaveBeenCalled();
  });

  it("throws when there is no session", async () => {
    getWebSession.mockResolvedValueOnce(null);
    await expect(
      commitProfile({ displayName: "Ada", headline: "h", bio: "b", tags: ["t"] }),
    ).rejects.toThrow(/not authenticated/i);
    expect(commitCreatorProfile).not.toHaveBeenCalled();
  });

  it("commits with the session context and redirects to the new profile", async () => {
    getWebSession.mockResolvedValueOnce(sessionUser);
    commitCreatorProfile.mockResolvedValueOnce({ profileId: "profile_123" });

    await expect(
      commitProfile({ displayName: "Ada", headline: "h", bio: "b", tags: ["t"] }),
    ).rejects.toThrow("NEXT_REDIRECT:/creator/profile_123");

    expect(commitCreatorProfile).toHaveBeenCalledTimes(1);
    const [ctx, input] = commitCreatorProfile.mock.calls[0]!;
    expect(ctx).toMatchObject({ userId: "user_1", currentRoles: ["member"] });
    expect(input).toEqual({ displayName: "Ada", headline: "h", bio: "b", tags: ["t"] });
  });
});
