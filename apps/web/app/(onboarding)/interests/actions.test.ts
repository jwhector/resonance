import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The interest Server Action's job is the three things only the app layer can do: parse untrusted
 * input, resolve the member from the **session**, and inject the embedder `@resonance/db` may not
 * import. Everything below pins one of those; the write itself belongs to `setMemberInterests` and
 * is tested in `@resonance/db` against real Postgres.
 */
const setMemberInterests = vi.fn();
const setOnboardingIntent = vi.fn();
const getWebSession = vi.fn();
const interestsEmbedder = vi.fn();
const redirect = vi.fn((url: string) => {
  // next/navigation's redirect throws to unwind; emulate that so tests see the same control flow.
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("@resonance/db", () => ({
  createDb: () => ({ __db: true }),
  setMemberInterests: (db: unknown, args: unknown) => setMemberInterests(db, args),
  setOnboardingIntent: (db: unknown, userId: string, intent: unknown) =>
    setOnboardingIntent(db, userId, intent),
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
      memberId: "user_member",
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
    await expect(saveInterests({ topicSlugs: [] })).resolves.toEqual({
      ok: true,
      memberId: "user_member",
    });

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

    await expect(saveInterestsFromForm("share", form)).rejects.toThrow(
      "REDIRECT:/onboarding/creator",
    );
    expect(setMemberInterests).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ topicSlugs: ["wellness", "herbalism"] }),
    );
  });

  it("treats an unchecked form as the skip case, not a failure", async () => {
    await expect(saveInterestsFromForm("share", new FormData())).rejects.toThrow(
      "REDIRECT:/onboarding/creator",
    );
    expect(setMemberInterests).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ topicSlugs: [] }),
    );
  });

  it.each([["share"], ["business"]])(
    "sends an expired session back to sign-up still carrying its stated %s intent",
    async (intent) => {
      getWebSession.mockResolvedValue(null);

      // Whoever said they came to create re-enters sign-up on the path they chose, not silently
      // as a member — and nothing is written for a session that no longer exists.
      await expect(saveInterestsFromForm(intent, new FormData())).rejects.toThrow(
        `REDIRECT:/signup?intent=${intent}`,
      );
      expect(setMemberInterests).not.toHaveBeenCalled();
      expect(setOnboardingIntent).not.toHaveBeenCalled();
    },
  );

  it.each([[undefined], ["explore"], ["creator"]])(
    "keeps the expired-session bounce bare when %o was stated",
    async (stated) => {
      getWebSession.mockResolvedValue(null);

      // `/start` never sends `explore` through sign-up, so this bounce does not mint
      // /signup?intent=explore either; a forged value reads as nothing stated.
      await expect(saveInterestsFromForm(stated, new FormData())).rejects.toThrow(
        /REDIRECT:\/signup$/,
      );
      expect(setOnboardingIntent).not.toHaveBeenCalled();
    },
  );

  it("keeps the stated intent on the URL it bounces a rejected selection back to", async () => {
    const form = new FormData();
    form.append("topicSlugs", "Not A Slug");

    // Without the intent on the retry URL, a second attempt would route somewhere the first
    // would not have — the answer would be lost by the act of getting it wrong once.
    await expect(saveInterestsFromForm("business", form)).rejects.toThrow(
      "REDIRECT:/interests?intent=business",
    );
    expect(setOnboardingIntent).not.toHaveBeenCalled();
  });
});

/**
 * The fork, asserted one intent at a time. Where someone lands and what gets stored are two
 * separate claims about the same submission, so each case pins both.
 */
describe("saveInterestsFromForm — the intent fork", () => {
  it.each([
    ["share", "/onboarding/creator"],
    ["business", "/onboarding/creator"],
    ["explore", "/discover"],
  ])("stores %s and continues to %s", async (intent, destination) => {
    await expect(saveInterestsFromForm(intent, new FormData())).rejects.toThrow(
      `REDIRECT:${destination}`,
    );
    expect(setOnboardingIntent).toHaveBeenCalledWith({ __db: true }, "user_member", intent);
  });

  it("sends someone who stated nothing to /discover, storing no answer for them", async () => {
    // An account reaches this step without an intent by signing in through a bare link: /start
    // sends `explore` to /discover and never through sign-up. Writing an intent here would
    // fabricate an answer indistinguishable from one someone actually gave.
    await expect(saveInterestsFromForm(undefined, new FormData())).rejects.toThrow(
      "REDIRECT:/discover",
    );
    expect(setOnboardingIntent).not.toHaveBeenCalled();
    expect(setMemberInterests).toHaveBeenCalled();
  });

  it.each([["creator"], ["../onboarding/creator"], [""], [42]])(
    "treats %o as no intent rather than failing the submission",
    async (forged) => {
      await expect(saveInterestsFromForm(forged, new FormData())).rejects.toThrow(
        "REDIRECT:/discover",
      );
      expect(setOnboardingIntent).not.toHaveBeenCalled();
    },
  );
});
