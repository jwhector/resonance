import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Button, buttonVariants } from "./button";

describe("buttonVariants", () => {
  it("exposes a full-width `wide` size", () => {
    expect(buttonVariants({ size: "wide" })).toContain("w-full");
  });

  it("defaults to the primary variant", () => {
    expect(buttonVariants()).toContain("bg-primary");
  });
});

describe("Button", () => {
  it("renders a native button with its children", () => {
    render(<Button>Create account</Button>);
    const button = screen.getByRole("button", { name: "Create account" });
    expect(button.tagName).toBe("BUTTON");
  });

  it("applies the wide variant classes", () => {
    render(<Button size="wide">Submit</Button>);
    expect(screen.getByRole("button", { name: "Submit" })).toHaveClass("w-full");
  });

  it("fires onClick when pressed", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("can render as a child element via asChild", () => {
    render(
      <Button asChild>
        <a href="/next">Go</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: "Go" });
    expect(link).toHaveAttribute("href", "/next");
  });
});
