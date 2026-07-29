import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tag, TagGroup, tagVariants } from "./tag";

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

describe("tagVariants", () => {
  it("defaults to the outlined `Added` treatment", () => {
    render(<Tag>Dreamwork</Tag>);
    expect(screen.getByText("Dreamwork").className).toContain("border-foreground");
  });

  it("maps the Figma Selectable / Selected states onto tokens", () => {
    expect(tagVariants({ variant: "selectable" })).toContain("border-border");
    const selected = tagVariants({ variant: "selected" });
    expect(selected).toContain("border-primary");
    expect(selected).toContain("bg-primary-subtle");
    expect(selected).toContain("text-primary");
  });

  it("keeps the frame's shared chip geometry across every variant", () => {
    for (const variant of ["outline", "selectable", "selected"] as const) {
      const classes = tagVariants({ variant });
      expect(classes).toContain("border-2");
      expect(classes).toContain("rounded-md");
      // 10px padding + the 2px border = the frame's 42px chip (Figma strokes draw inside).
      expect(classes).toContain("p-2.5");
      expect(classes).toContain("text-caption");
    }
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
