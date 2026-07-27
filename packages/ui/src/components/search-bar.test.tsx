import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchBar } from "./search-bar";

const noop = () => {};

describe("SearchBar", () => {
  it("renders a labelled search field inside a search landmark", () => {
    render(<SearchBar value="" onValueChange={noop} />);

    expect(screen.getByRole("search", { name: "Search Resonance" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Search Resonance" })).toHaveAttribute(
      "placeholder",
      "Search on Resonance",
    );
  });

  it("reports every edit to the parent", () => {
    const onValueChange = vi.fn();
    render(<SearchBar value="Tinct" onValueChange={onValueChange} />);

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "Tinctures" } });
    expect(onValueChange).toHaveBeenCalledWith("Tinctures");
  });

  it("hides the clear control while the field is empty", () => {
    render(<SearchBar value="" onValueChange={noop} />);
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("clears to an empty query and notifies onClear", () => {
    const onValueChange = vi.fn();
    const onClear = vi.fn();
    render(<SearchBar value="Tinctures" onValueChange={onValueChange} onClear={onClear} />);

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(onValueChange).toHaveBeenCalledWith("");
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("submits the current query without navigating", () => {
    const onSearch = vi.fn();
    render(<SearchBar value="Tinctures" onValueChange={noop} onSearch={onSearch} />);

    fireEvent.submit(screen.getByRole("search"));
    expect(onSearch).toHaveBeenCalledWith("Tinctures");
  });

  it("disables the field and the clear control when disabled", () => {
    render(<SearchBar value="Tinctures" onValueChange={noop} disabled />);

    expect(screen.getByRole("searchbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Clear search" })).toBeDisabled();
  });
});
