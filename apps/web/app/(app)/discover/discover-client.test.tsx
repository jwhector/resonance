import type { CreatorResult } from "@resonance/core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// App Router hooks need a mounted router; the Server Actions are the module boundary this
// component is wired to, so both are mocked at their import specifiers.
const routerPush = vi.fn();
const followCreator = vi.fn();
const unfollowCreator = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock("./actions", () => ({
  followCreator: (input: unknown) => followCreator(input),
  unfollowCreator: (input: unknown) => unfollowCreator(input),
}));

import { DiscoverClient } from "./discover-client";

function creator(overrides: Partial<CreatorResult> = {}): CreatorResult {
  return {
    profileId: "11111111-1111-4111-8111-111111111111",
    userId: "creator_9",
    displayName: "Ada Lovelace",
    headline: "Maker of small tools",
    tags: ["tools"],
    similarity: 0.82,
    followState: "unknown",
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("DiscoverClient — search and tab state live in the URL", () => {
  it("navigates on submit, so a ranked page is shareable and reloadable", () => {
    render(<DiscoverClient query="" kind="creators" results={[]} signedIn={false} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "tinctures" } });
    fireEvent.submit(screen.getByRole("search"));

    expect(routerPush).toHaveBeenCalledWith("/discover?q=tinctures");
  });

  it("carries the query across a tab switch", () => {
    render(<DiscoverClient query="tinctures" kind="creators" results={[]} signedIn={false} />);

    fireEvent.click(screen.getByRole("tab", { name: "Products" }));

    expect(routerPush).toHaveBeenCalledWith("/discover?q=tinctures&tab=products");
  });
});

describe("DiscoverClient — the three empty surfaces stay distinct", () => {
  it("shows the dataless-tab state on Products, never the search outcome", () => {
    render(<DiscoverClient query="tinctures" kind="products" results={[]} signedIn={false} />);

    expect(screen.getByText(/Product search is coming soon/i)).toBeInTheDocument();
    expect(screen.queryByText(/No creators match/i)).not.toBeInTheDocument();
  });

  it("shows the zero-result state for a real Creators search that found nothing", () => {
    render(<DiscoverClient query="tinctures" kind="creators" results={[]} signedIn={false} />);

    expect(screen.getByText(/No creators match/i)).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it("shows neither before anything has been searched", () => {
    render(<DiscoverClient query="" kind="creators" results={[]} signedIn={false} />);

    expect(screen.queryByText(/No creators match/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });
});

describe("DiscoverClient — follow", () => {
  it("prompts a signed-out member to sign in instead of silently failing", async () => {
    render(
      <DiscoverClient query="tinctures" kind="creators" results={[creator()]} signedIn={false} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Follow Ada Lovelace" }));

    const prompt = await screen.findByRole("alert");
    expect(prompt).toHaveTextContent(/sign in to follow creators/i);
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/signup");
    // Nothing attempted, nothing changed — the member was asked, not ignored.
    expect(followCreator).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Follow Ada Lovelace" })).toBeInTheDocument();
  });

  it("follows for a signed-in member and flips the row to Following", async () => {
    followCreator.mockResolvedValueOnce({ ok: true, followState: "following" });
    render(
      <DiscoverClient
        query="tinctures"
        kind="creators"
        results={[creator({ followState: "not_following" })]}
        signedIn
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Follow Ada Lovelace" }));

    expect(followCreator).toHaveBeenCalledWith({ creatorUserId: "creator_9" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Unfollow Ada Lovelace" })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("unfollows from the Following state", async () => {
    unfollowCreator.mockResolvedValueOnce({ ok: true, followState: "not_following" });
    render(
      <DiscoverClient
        query="tinctures"
        kind="creators"
        results={[creator({ followState: "following" })]}
        signedIn
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Unfollow Ada Lovelace" }));

    expect(unfollowCreator).toHaveBeenCalledWith({ creatorUserId: "creator_9" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Follow Ada Lovelace" })).toBeInTheDocument(),
    );
  });

  it("prompts when the session expired between render and click", async () => {
    followCreator.mockResolvedValueOnce({ ok: false, reason: "unauthenticated" });
    render(
      <DiscoverClient
        query="tinctures"
        kind="creators"
        results={[creator({ followState: "not_following" })]}
        signedIn
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Follow Ada Lovelace" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/sign in to follow creators/i);
  });

  it("says something true when the row is the viewer's own profile", async () => {
    followCreator.mockResolvedValueOnce({ ok: false, reason: "follow_self" });
    render(
      <DiscoverClient
        query="tinctures"
        kind="creators"
        results={[creator({ followState: "not_following" })]}
        signedIn
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Follow Ada Lovelace" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/can't follow yourself/i);
  });

  it("links each row to the creator's profile", () => {
    render(
      <DiscoverClient query="tinctures" kind="creators" results={[creator()]} signedIn={false} />,
    );

    expect(screen.getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute(
      "href",
      "/creator/11111111-1111-4111-8111-111111111111",
    );
  });
});
