import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tag, TagGroup } from "./tag";

describe("Tag", () => {
  it("renders its label", () => {
    render(<Tag>Dreamwork</Tag>);
    expect(screen.getByText("Dreamwork")).toBeInTheDocument();
  });

  it("renders no remove button when not removable", () => {
    render(<Tag>Dreamwork</Tag>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders an accessible remove button and fires onRemove", () => {
    const onRemove = vi.fn();
    render(<Tag onRemove={onRemove}>Dreamwork</Tag>);
    const remove = screen.getByRole("button", { name: "Remove Dreamwork" });
    fireEvent.click(remove);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("honors an explicit removeLabel", () => {
    render(
      <Tag onRemove={() => {}} removeLabel="Delete keyword">
        Dreamwork
      </Tag>,
    );
    expect(screen.getByRole("button", { name: "Delete keyword" })).toBeInTheDocument();
  });
});

describe("TagGroup", () => {
  it("exposes a list of listitems", () => {
    render(
      <TagGroup aria-label="Search keywords">
        <Tag>One</Tag>
        <Tag>Two</Tag>
      </TagGroup>,
    );
    expect(screen.getByRole("list", { name: "Search keywords" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
