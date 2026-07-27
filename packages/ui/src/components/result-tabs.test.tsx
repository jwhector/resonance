import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RESULT_TAB_ORDER, ResultTabs } from "./result-tabs";

const noop = () => {};

describe("ResultTabs", () => {
  it("renders the four designed tabs in the designed order", () => {
    render(<ResultTabs value="creators" onValueChange={noop} />);

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Products",
      "Services",
      "Posts",
      "Creators",
    ]);
    expect(RESULT_TAB_ORDER).toEqual(["products", "services", "posts", "creators"]);
  });

  it("marks exactly the selected scope as selected", () => {
    render(<ResultTabs value="creators" onValueChange={noop} />);

    expect(screen.getByRole("tab", { name: "Creators", selected: true })).toBeInTheDocument();
    expect(screen.getAllByRole("tab", { selected: false })).toHaveLength(3);
  });

  it("reports the core ResultKind for the clicked tab", () => {
    const onValueChange = vi.fn();
    render(<ResultTabs value="creators" onValueChange={onValueChange} />);

    fireEvent.click(screen.getByRole("tab", { name: "Products" }));
    expect(onValueChange).toHaveBeenCalledWith("products");
  });

  it("moves between scopes with the arrow keys and wraps at the ends", () => {
    const onValueChange = vi.fn();
    render(<ResultTabs value="creators" onValueChange={onValueChange} />);

    fireEvent.keyDown(screen.getByRole("tab", { name: "Creators" }), { key: "ArrowLeft" });
    expect(onValueChange).toHaveBeenLastCalledWith("posts");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Creators" }), { key: "ArrowRight" });
    expect(onValueChange).toHaveBeenLastCalledWith("products");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Creators" }), { key: "Home" });
    expect(onValueChange).toHaveBeenLastCalledWith("products");
  });

  it("keeps only the selected tab in the tab order (roving tabindex)", () => {
    render(<ResultTabs value="posts" onValueChange={noop} />);

    expect(screen.getByRole("tab", { name: "Posts" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Creators" })).toHaveAttribute("tabindex", "-1");
  });
});
