import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The interest Server Action's job is the three things only the app layer can do: parse untrusted
 * input, resolve the member from the **session**, and inject the embedder `@resonance/db` may not
 * import. Everything below pins one of those; the write itself belongs to `setMemberInterests` and
 * is tested in `@resonance/db` against real Postgres.
 */
const setMemberInterests = vi.fn();
const getWebSession = vi.fn();
const interestsEmbedder = vi.fn();
const redirect = vi.fn((url: string) => {
  // next/navigation's redirect throws to unwind; emulate that so tests see the same control flow.
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("@resonance/db", () => ({
  createDb: () => ({ __db: true }),
  setMemberInterests: (db: unknown, args: unknown) => setMemberInterests(db, args),
}));
vi.mock("next/headers", () => ({ headers: () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("../../../lib/auth", () => ({ getWebSession: () => getWebSession() }));
vi.mock("../../../lib/e2e-harness", () => ({ interestsEmbedder: () => interestsEmbedder() }));

import { saveInterests, saveInterestsFromForm } from "./actions";

const EMBEDDER = { model: "voyage-3.5", embed: vi.fn() };
const MEMBER = { id: "user_member", email: "m@example.com", roles: ["member"] };

beforeEach(() => {
  vi.clearAllMocks();
  interestsEmbedder.mockResolvedValue(EMBEDDER);
  getWebSession.mockResolvedValue(MEMBER);
});

describe("saveInterests", () => {
  it("persists a validated selection against the SESSION's member", async () => {
    await expect(saveInterests({ topicSlugs: ["wellness", "tea-culture"] })).resolves.toEqual({
      ok: true,
    });

    expect(setMemberInterests).toHaveBeenCalledWith(
      { __db: true },
      { memberId: "user_member", topicSlugs: ["wellness", "tea-culture"], embedder: EMBEDDER },
    );
  });

  it("takes the member from the session even when the payload claims someone else", async () => {
    // The schema strips unknown keys, so there is no field to spoof — this pins that it stays true.
    await saveInterests({ topicSlugs: ["art"], memberId: "user_attacker" });

    expect(setMemberInterests).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ memberId: "user_member" }),
    );
  });

  it("records an empty selection rather than skipping the write", async () => {
    // Skipping is supported, and clearing must actually clear — an early return here would leave a
    // stale interest vector still ranking /discover for a member who just removed their topics.
    await expect(saveInterests({ topicSlugs: [] })).resolves.toEqual({ ok: true });

    expect(setMemberInterests).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ topicSlugs: [] }),
    );
  });

  it("refuses without a session instead of throwing", async () => {
    getWebSession.mockResolvedValue(null);

    await expect(saveInterests({ topicSlugs: ["art"] })).resolves.toEqual({
      ok: false,
      reason: "unauthenticated",
    });
    expect(setMemberInterests).not.toHaveBeenCalled();
  });

  it("rejects a malformed selection at the boundary, before any write", async () => {
    for (const bad of [
      { topicSlugs: ["Tea Culture"] }, // not a slug
      { topicSlugs: ["art", "art"] }, // duplicates are rejected, not deduped
      { topicSlugs: "art" }, // not an array
    ]) {
      await expect(saveInterests(bad)).resolves.toEqual({ ok: false, reason: "invalid" });
    }
    expect(setMemberInterests).not.toHaveBeenCalled();
  });
});

describe("saveInterestsFromForm — the no-JS path", () => {
  it("reads the checked chips off FormData and continues past the step", async () => {
    const form = new FormData();
    form.append("topicSlugs", "wellness");
    form.append("topicSlugs", "herbalism");

    await expect(saveInterestsFromForm(form)).rejects.toThrow("REDIRECT:/onboarding/creator");
    expect(setMemberInterests).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ topicSlugs: ["wellness", "herbalism"] }),
    );
  });

  it("treats an unchecked form as the skip case, not a failure", async () => {
    await expect(saveInterestsFromForm(new FormData())).rejects.toThrow(
      "REDIRECT:/onboarding/creator",
    );
    expect(setMemberInterests).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ topicSlugs: [] }),
    );
  });

  it("sends an expired session back to the front door rather than 500ing", async () => {
    getWebSession.mockResolvedValue(null);

    await expect(saveInterestsFromForm(new FormData())).rejects.toThrow("REDIRECT:/signup");
    expect(setMemberInterests).not.toHaveBeenCalled();
  });
});
