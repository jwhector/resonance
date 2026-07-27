import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ComingSoonState, type ComingSoonKind, NoResultsState } from "./discovery-empty-states";

describe("ComingSoonState", () => {
  const nouns: ReadonlyArray<[ComingSoonKind, string]> = [
    ["products", "Product search is coming soon"],
    ["services", "Service search is coming soon"],
    ["posts", "Post search is coming soon"],
  ];

  it.each(nouns)("adapts the signed-off heading noun for the %s tab", (kind, heading) => {
    render(<ComingSoonState kind={kind} />);

    expect(screen.getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Creators are searchable today. Products, services and posts arrive with the next member slices.",
      ),
    ).toBeInTheDocument();
  });

  it("badges the state so it does not read as breakage", () => {
    render(<ComingSoonState kind="products" />);
    expect(screen.getByText("Coming soon")).toBeInTheDocument();
  });
});

describe("NoResultsState", () => {
  it("echoes the query back and announces the outcome", () => {
    render(<NoResultsState query="tinctures" />);

    expect(screen.getByRole("status")).toHaveTextContent("No creators match “tinctures”");
  });
});

/**
 * `pl-bbca` acceptance criterion 2 / risk 7: a permanently dataless tab and a search that
 * found nothing are different states and must stay visually distinguishable. This asserts
 * the distinction rather than trusting it — it is the test that stops the two from quietly
 * regressing into identical blanks.
 */
describe("a dataless tab vs. a zero-result search", () => {
  it("renders two distinguishable states", () => {
    const comingSoon = render(<ComingSoonState kind="products" />).container.firstElementChild;
    const noResults = render(<NoResultsState query="tinctures" />).container.firstElementChild;

    // 1. Different machine-readable state markers.
    expect(comingSoon).toHaveAttribute("data-empty-state", "coming-soon");
    expect(noResults).toHaveAttribute("data-empty-state", "no-results");

    // 2. Different headings — neither one's copy appears in the other.
    const comingSoonHeading = "Product search is coming soon";
    const noResultsHeading = "No creators match “tinctures”";
    expect(comingSoon).toHaveTextContent(comingSoonHeading);
    expect(comingSoon).not.toHaveTextContent(noResultsHeading);
    expect(noResults).toHaveTextContent(noResultsHeading);
    expect(noResults).not.toHaveTextContent(comingSoonHeading);

    // 3. Different chrome — only the dataless tab carries the badge and the panel.
    expect(comingSoon?.textContent).toContain("Coming soon");
    expect(noResults?.textContent).not.toContain("Coming soon");
    expect(comingSoon?.className).toContain("border");
    expect(noResults?.className).not.toContain("border");

    // 4. Only the search outcome is announced as a live region.
    expect(noResults).toHaveAttribute("role", "status");
    expect(comingSoon).not.toHaveAttribute("role");

    // 5. Nothing in one renders identically to the other.
    expect(comingSoon?.textContent).not.toBe(noResults?.textContent);
  });
});
