import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OtpInput } from "./otp-input";

/** OtpInput is controlled; a tiny stateful host mirrors how a card composes it. */
function Harness({
  length = 6,
  onComplete,
}: {
  length?: number;
  onComplete?: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  return <OtpInput value={value} onChange={setValue} length={length} onComplete={onComplete} />;
}

function typeInto(input: HTMLElement, char: string) {
  fireEvent.change(input, { target: { value: char } });
}

describe("OtpInput", () => {
  it("renders a labeled group of six cells by default", () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Verification code" })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  it("labels each cell for screen readers", () => {
    render(<Harness />);
    expect(screen.getByRole("textbox", { name: "Digit 1 of 6" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Digit 6 of 6" })).toBeInTheDocument();
  });

  it("fills each cell and advances focus as digits are typed", () => {
    render(<Harness />);
    const cells = screen.getAllByRole("textbox");

    typeInto(cells[0]!, "1");
    expect(cells[0]).toHaveValue("1");
    expect(cells[1]).toHaveFocus();

    typeInto(cells[1]!, "2");
    expect(cells[1]).toHaveValue("2");
    expect(cells[2]).toHaveFocus();
  });

  it("backspace on an empty cell clears and retreats to the previous cell", () => {
    render(<Harness />);
    const cells = screen.getAllByRole("textbox");

    typeInto(cells[0]!, "1");
    typeInto(cells[1]!, "2");
    // Focus is now on the empty cell 2; Backspace steps back and clears cell 1.
    fireEvent.keyDown(cells[2]!, { key: "Backspace" });
    expect(cells[1]).toHaveValue("");
    expect(cells[0]).toHaveValue("1");
    expect(cells[1]).toHaveFocus();
  });

  it("fires onComplete once every cell is filled", () => {
    const onComplete = vi.fn();
    render(<Harness onComplete={onComplete} />);
    const cells = screen.getAllByRole("textbox");

    "123456".split("").forEach((digit, i) => typeInto(cells[i]!, digit));
    expect(onComplete).toHaveBeenCalledWith("123456");
  });

  it("honors a custom length", () => {
    render(<Harness length={4} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
    expect(screen.getByRole("textbox", { name: "Digit 4 of 4" })).toBeInTheDocument();
  });
});
