import type { CreatorResult } from "@resonance/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreatorResultList } from "./creator-result-list";

const results: CreatorResult[] = [
  {
    profileId: "11111111-1111-4111-8111-111111111111",
    userId: "user_mike",
    displayName: "North Star Fermentation",
    headline: "Small-batch tinctures and ferments",
    tags: ["tinctures"],
    similarity: 0.82,
    followState: "not_following",
  },
  {
    profileId: "22222222-2222-4222-8222-222222222222",
    userId: "user_hana",
    displayName: "Moonwell Studio",
    headline: "Hand-thrown ceramics",
    tags: ["ceramics"],
    similarity: 0.71,
    followState: "following",
  },
];

describe("CreatorResultList", () => {
  it("renders one row per result, in the ranker's order", () => {
    render(<CreatorResultList results={results} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("North Star Fermentation");
    expect(items[1]).toHaveTextContent("Moonwell Studio");
  });

  it("builds each row's profile destination from hrefFor", () => {
    render(
      <CreatorResultList results={results} hrefFor={(result) => `/creator/${result.profileId}`} />,
    );

    expect(screen.getByRole("link", { name: "Moonwell Studio" })).toHaveAttribute(
      "href",
      "/creator/22222222-2222-4222-8222-222222222222",
    );
  });

  it("disables only the rows whose follow mutation is in flight", () => {
    render(<CreatorResultList results={results} pendingUserIds={["user_hana"]} />);

    expect(screen.getByRole("button", { name: "Follow North Star Fermentation" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Unfollow Moonwell Studio" })).toBeDisabled();
  });

  it("renders an empty list rather than inventing an empty state", () => {
    render(<CreatorResultList results={[]} />);

    expect(screen.getByRole("list", { name: "Creator results" })).toBeEmptyDOMElement();
  });
});
