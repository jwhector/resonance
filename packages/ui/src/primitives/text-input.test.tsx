import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TextInput } from "./text-input";

describe("TextInput", () => {
  it("renders a textbox defaulting to type text", () => {
    render(<TextInput aria-label="Email" />);
    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toHaveAttribute("type", "text");
  });

  it("accepts typed input", () => {
    render(<TextInput aria-label="Email" />);
    const input = screen.getByRole("textbox", { name: "Email" });
    fireEvent.change(input, { target: { value: "you@example.com" } });
    expect(input).toHaveValue("you@example.com");
  });

  it("forwards type and placeholder", () => {
    render(<TextInput type="email" placeholder="you@example.com" aria-label="Email" />);
    const input = screen.getByPlaceholderText("you@example.com");
    expect(input).toHaveAttribute("type", "email");
  });

  it("reflects the invalid state via aria-invalid", () => {
    render(<TextInput aria-invalid aria-label="Email" />);
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("aria-invalid", "true");
  });
});
