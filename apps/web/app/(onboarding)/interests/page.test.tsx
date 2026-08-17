import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The page is an async RSC, so it is exercised by awaiting it — enough to cover the one piece of
 * routing it owns: where a signed-out arrival is sent. The fork after a submission, and every
 * write, live with the action's tests.
 */
const getWebSession = vi.fn();
const redirect = vi.fn((url: string) => {
  // next/navigation's redirect throws to unwind; emulate that so tests see the same control flow.
  throw new Error(`REDIRECT:${url}`);
});

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));
vi.mock("../../../lib/auth", () => ({ getWebSession: (h: Headers) => getWebSession(h) }));
vi.mock("../../../lib/e2e-harness", () => ({ interestsEmbedder: vi.fn() }));
vi.mock("@resonance/db", () => ({
  createDb: () => ({ __db: true }),
  listTopics: vi.fn(async () => []),
  getMemberInterests: vi.fn(async () => []),
  setMemberInterests: vi.fn(),
  setOnboardingIntent: vi.fn(),
}));

import InterestsPage from "./page";

function loadPage(params: Record<string, string>) {
  return InterestsPage({ searchParams: Promise.resolve(params) });
}

beforeEach(() => {
  vi.clearAllMocks();
  getWebSession.mockResolvedValue(null);
});

describe("/interests — the signed-out bounce", () => {
  it.each([["share"], ["business"]])(
    "sends a signed-out arrival to sign-up still carrying its stated %s intent",
    async (intent) => {
      // Whoever said they came to create re-enters sign-up on the path they chose, not silently
      // as a member.
      await expect(loadPage({ intent })).rejects.toThrow(`REDIRECT:/signup?intent=${intent}`);
    },
  );

  it.each([[{}], [{ intent: "explore" }], [{ intent: "creator" }]])(
    "keeps the bounce bare when %o is on the URL",
    async (params) => {
      // `/start` never sends `explore` through sign-up, so this bounce does not mint
      // /signup?intent=explore either; a forged value reads as nothing stated.
      await expect(loadPage(params)).rejects.toThrow(/REDIRECT:\/signup$/);
    },
  );
});
