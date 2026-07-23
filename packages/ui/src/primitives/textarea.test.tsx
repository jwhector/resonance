import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("renders a multiline textbox", () => {
    render(<Textarea aria-label="About" />);
    const field = screen.getByRole("textbox", { name: "About" });
    expect(field.tagName).toBe("TEXTAREA");
  });

  it("accepts typed input", () => {
    render(<Textarea aria-label="About" />);
    const field = screen.getByRole("textbox", { name: "About" });
    fireEvent.change(field, { target: { value: "I throw functional stoneware." } });
    expect(field).toHaveValue("I throw functional stoneware.");
  });

  it("reflects the invalid state via aria-invalid", () => {
    render(<Textarea aria-invalid aria-label="About" />);
    expect(screen.getByRole("textbox", { name: "About" })).toHaveAttribute("aria-invalid", "true");
  });

  it("can be disabled", () => {
    render(<Textarea aria-label="About" disabled />);
    expect(screen.getByRole("textbox", { name: "About" })).toBeDisabled();
  });
});
