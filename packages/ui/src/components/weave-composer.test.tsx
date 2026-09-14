import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WeaveComposer } from "./weave-composer";

describe("WeaveComposer", () => {
  it("renders the inert + and microphone placeholders by default", () => {
    render(<WeaveComposer onSend={() => {}} />);
    expect(screen.getByRole("button", { name: "Add attachment" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Voice input" })).toBeDisabled();
  });

  it("omits the + and microphone entirely when deferred affordances are off", () => {
    render(<WeaveComposer onSend={() => {}} showDeferredAffordances={false} />);
    expect(screen.queryByRole("button", { name: "Add attachment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Voice input" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send to Weave" })).toBeInTheDocument();
  });

  it("clears its own draft after sending when uncontrolled", () => {
    const onSend = vi.fn();
    render(<WeaveComposer onSend={onSend} />);
    const field = screen.getByRole("textbox", { name: "Talk to Weave" });
    fireEvent.change(field, { target: { value: " hello " } });
    fireEvent.click(screen.getByRole("button", { name: "Send to Weave" }));
    expect(onSend).toHaveBeenCalledWith("hello");
    expect(field).toHaveValue("");
  });

  it("leaves a controlled value to its owner and sends a multiline draft on Enter", () => {
    const onSend = vi.fn();
    const onValueChange = vi.fn();
    render(
      <WeaveComposer
        multiline
        value="a long answer"
        onValueChange={onValueChange}
        onSend={onSend}
        maxLength={50}
      />,
    );
    const field = screen.getByRole("textbox", { name: "Talk to Weave" });
    expect(field.tagName).toBe("TEXTAREA");
    expect(field).toHaveAttribute("maxLength", "50");

    fireEvent.change(field, { target: { value: "a longer answer" } });
    expect(onValueChange).toHaveBeenCalledWith("a longer answer");

    fireEvent.keyDown(field, { key: "Enter", shiftKey: true });
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.keyDown(field, { key: "Enter" });
    expect(onSend).toHaveBeenCalledWith("a long answer");
    expect(onValueChange).not.toHaveBeenCalledWith("");
  });
});
