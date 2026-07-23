import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("exposes the checkbox role with the label as its accessible name", () => {
    render(<Checkbox label="I agree" />);
    expect(screen.getByRole("checkbox", { name: "I agree" })).toBeInTheDocument();
  });

  it("associates the label with the control via htmlFor/id", () => {
    render(<Checkbox id="consent" label="I agree" />);
    // getByLabelText resolves through the <label htmlFor> association.
    expect(screen.getByLabelText("I agree")).toHaveAttribute("id", "consent");
  });

  it("toggles checked state and fires onCheckedChange on click", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Subscribe" onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Subscribe" });

    expect(box).not.toBeChecked();
    fireEvent.click(box);
    expect(box).toBeChecked();
    expect(onCheckedChange).toHaveBeenCalledWith(true);

    fireEvent.click(box);
    expect(box).not.toBeChecked();
    expect(onCheckedChange).toHaveBeenLastCalledWith(false);
  });

  it("reflects a controlled checked prop", () => {
    render(<Checkbox checked readOnly label="Subscribed" />);
    expect(screen.getByRole("checkbox", { name: "Subscribed" })).toBeChecked();
  });

  it("does not toggle when disabled", () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="Locked" disabled onCheckedChange={onCheckedChange} />);
    const box = screen.getByRole("checkbox", { name: "Locked" });

    fireEvent.click(box);
    expect(box).not.toBeChecked();
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
