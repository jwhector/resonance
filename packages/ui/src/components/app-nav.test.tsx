import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppNav } from "./app-nav";

describe("AppNav", () => {
  it("renders the main navigation landmark with the Resonance mark", () => {
    render(<AppNav />);
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Resonance" })).toBeInTheDocument();
  });

  it("renders the section icons as inert placeholders (destinations unbuilt)", () => {
    render(<AppNav />);
    for (const label of ["Home", "Orders", "Calendar"]) {
      expect(screen.getByRole("button", { name: label })).toBeDisabled();
    }
  });
});
