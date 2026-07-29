import type { CreatorResult, CreatorResultPage } from "@resonance/core";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The page is an async RSC, so it is exercised by awaiting it and rendering the element tree it
 * returns — which is enough to cover the only logic it owns: turning untrusted `searchParams` into
 * either a ranked query or one of the non-search surfaces.
 */
const getWebSession = vi.fn();
const searchCreators = vi.fn();
const routerPush = vi.fn();

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock("../../../lib/auth", () => ({ getWebSession: (h: Headers) => getWebSession(h) }));
vi.mock("./actions", () => ({
  searchCreators: (input: unknown) => searchCreators(input),
  followCreator: vi.fn(),
  unfollowCreator: vi.fn(),
}));

import DiscoverPage from "./page";

const result: CreatorResult = {
  profileId: "11111111-1111-4111-8111-111111111111",
  userId: "creator_9",
  displayName: "Ada Lovelace",
  headline: "Maker of small tools",
  tags: ["tools"],
  similarity: 0.82,
  followState: "unknown",
};

function page(results: CreatorResult[] = []): CreatorResultPage {
  return { kind: "creators", results, nextCursor: null };
}

async function renderPage(params: Record<string, string | string[]>) {
  render(await DiscoverPage({ searchParams: Promise.resolve(params) }));
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("/discover", () => {
  it("serves a signed-out member the ranked results (no redirect, no gate)", async () => {
    getWebSession.mockResolvedValueOnce(null);
    searchCreators.mockResolvedValueOnce(page([result]));

    await renderPage({ q: "tinctures" });

    expect(searchCreators).toHaveBeenCalledWith(expect.objectContaining({ text: "tinctures" }));
    expect(screen.getByRole("link", { name: "Ada Lovelace" })).toBeInTheDocument();
  });

  it("does not search when nothing has been asked", async () => {
    getWebSession.mockResolvedValueOnce(null);

    await renderPage({});

    expect(searchCreators).not.toHaveBeenCalled();
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });

  it("treats an over-long pasted query as a page state, not a crash", async () => {
    getWebSession.mockResolvedValueOnce(null);

    await expect(renderPage({ q: "x".repeat(500) })).resolves.toBeUndefined();

    expect(searchCreators).not.toHaveBeenCalled();
  });

  it("falls back to Creators for an unknown ?tab rather than 404-ing", async () => {
    getWebSession.mockResolvedValueOnce(null);
    searchCreators.mockResolvedValueOnce(page([result]));

    await renderPage({ q: "tinctures", tab: "bogus" });

    expect(screen.getByRole("tab", { name: "Creators" })).toHaveAttribute("aria-selected", "true");
  });

  it("never runs a ranked query for a tab with no data source", async () => {
    getWebSession.mockResolvedValueOnce(null);

    await renderPage({ q: "tinctures", tab: "posts" });

    expect(searchCreators).not.toHaveBeenCalled();
    expect(screen.getByText(/Post search is coming soon/i)).toBeInTheDocument();
  });

  it("takes the first value of a repeated ?q", async () => {
    getWebSession.mockResolvedValueOnce(null);
    searchCreators.mockResolvedValueOnce(page());

    await renderPage({ q: ["tinctures", "something else"] });

    expect(searchCreators).toHaveBeenCalledWith(expect.objectContaining({ text: "tinctures" }));
  });

  // Slice B (resonance-3a7d): no query text is a *personalized* request, not "nothing asked".
  describe("personalized surface when there is no query", () => {
    const signedIn = { id: "user_member", email: "m@example.com", roles: ["member"] };

    it("asks the port to rank for the viewer, with NO text field", async () => {
      getWebSession.mockResolvedValueOnce(signedIn);
      searchCreators.mockResolvedValueOnce(page([result]));

      await renderPage({});

      // Absent, not empty: `text: ""` would fail validation and mean a malformed search.
      const input = searchCreators.mock.calls[0]![0] as Record<string, unknown>;
      expect("text" in input).toBe(false);
      expect(screen.getByRole("link", { name: "Ada Lovelace" })).toBeInTheDocument();
      // The box stays empty — the results were not produced from typed text.
      expect(screen.getByRole("searchbox")).toHaveValue("");
    });

    it("shows the idle surface, not 'no results', when the member skipped the picker", async () => {
      getWebSession.mockResolvedValueOnce(signedIn);
      searchCreators.mockResolvedValueOnce(page());

      await renderPage({});

      // Nothing searched AND nothing to suggest. Calling this "no results" would blame the member
      // for a query they never made.
      expect(document.querySelector('[data-empty-state="idle"]')).not.toBeNull();
    });

    it("still refuses a BLANK query rather than treating it as personalized", async () => {
      getWebSession.mockResolvedValueOnce(signedIn);

      await renderPage({ q: "   " });

      // Whitespace trims to empty and fails `.min(1)`: malformed input, not a request to be ranked.
      expect(searchCreators).not.toHaveBeenCalled();
      expect(document.querySelector('[data-empty-state="idle"]')).not.toBeNull();
    });

    it("does not ask at all for a signed-out visitor", async () => {
      getWebSession.mockResolvedValueOnce(null);

      await renderPage({});

      // The port would answer an empty page anyway (invariant 8); skipping spares the round trip.
      expect(searchCreators).not.toHaveBeenCalled();
    });
  });
});
