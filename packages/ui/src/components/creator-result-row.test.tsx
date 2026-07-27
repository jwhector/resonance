import type { ComponentProps } from "react";
import type { CreatorResult, FollowState } from "@resonance/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreatorResultRow, initialsFor } from "./creator-result-row";

function makeResult(overrides: Partial<CreatorResult> = {}): CreatorResult {
  return {
    profileId: "11111111-1111-4111-8111-111111111111",
    userId: "user_mike",
    displayName: "North Star Fermentation",
    headline: "Small-batch tinctures and ferments",
    tags: ["tinctures", "ferments"],
    similarity: 0.82,
    followState: "not_following",
    ...overrides,
  };
}

function renderRow(props: Partial<ComponentProps<typeof CreatorResultRow>> = {}) {
  const { result = makeResult(), ...rest } = props;
  return render(
    <ul>
      <CreatorResultRow result={result} {...rest} />
    </ul>,
  );
}

describe("initialsFor", () => {
  it("takes up to two initials and upper-cases them", () => {
    expect(initialsFor("North Star Fermentation")).toBe("NS");
    expect(initialsFor("moonwell")).toBe("M");
  });

  it("falls back rather than rendering an empty plate", () => {
    expect(initialsFor("   ")).toBe("?");
  });
});

describe("CreatorResultRow", () => {
  it("renders the creator's name, subtitle and initials placeholder", () => {
    renderRow();

    expect(screen.getByText("North Star Fermentation")).toBeInTheDocument();
    expect(screen.getByText("Small-batch tinctures and ferments")).toBeInTheDocument();
    // Delta 1: no image prop exists — the 48×48 slot carries initials.
    expect(screen.getByText("NS")).toBeInTheDocument();
  });

  it("links the display name to the profile when a destination is given", () => {
    renderRow({ href: "/creator/11111111-1111-4111-8111-111111111111" });

    expect(screen.getByRole("link", { name: "North Star Fermentation" })).toHaveAttribute(
      "href",
      "/creator/11111111-1111-4111-8111-111111111111",
    );
  });

  it("renders the name as plain text with no destination", () => {
    renderRow();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // The three FollowState renderings — including the signed-out `unknown` viewer.
  const cases: ReadonlyArray<{
    followState: FollowState;
    label: string;
    accessibleName: string;
    pressed: string | null;
  }> = [
    {
      followState: "not_following",
      label: "Follow",
      accessibleName: "Follow North Star Fermentation",
      pressed: "false",
    },
    {
      followState: "following",
      label: "Following",
      accessibleName: "Unfollow North Star Fermentation",
      pressed: "true",
    },
    {
      followState: "unknown",
      label: "Follow",
      accessibleName: "Follow North Star Fermentation",
      pressed: null,
    },
  ];

  it.each(cases)(
    "renders the $followState follow control",
    ({ followState, label, accessibleName, pressed }) => {
      renderRow({ result: makeResult({ followState }) });

      const button = screen.getByRole("button", { name: accessibleName });
      expect(button).toHaveTextContent(label);
      expect(button).toHaveAttribute("data-follow-state", followState);
      if (pressed === null) {
        // Signed out: "not followed" and "we cannot know" are different claims.
        expect(button).not.toHaveAttribute("aria-pressed");
      } else {
        expect(button).toHaveAttribute("aria-pressed", pressed);
      }
    },
  );

  it("hands the whole result back when the follow control is used", () => {
    const onFollowToggle = vi.fn();
    const result = makeResult();
    renderRow({ result, onFollowToggle });

    fireEvent.click(screen.getByRole("button", { name: "Follow North Star Fermentation" }));
    expect(onFollowToggle).toHaveBeenCalledWith(result);
  });

  it("disables the control while its follow mutation is in flight", () => {
    const onFollowToggle = vi.fn();
    renderRow({ onFollowToggle, followPending: true });

    const button = screen.getByRole("button", { name: "Follow North Star Fermentation" });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onFollowToggle).not.toHaveBeenCalled();
  });
});
