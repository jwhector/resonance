import type { InterviewMessage } from "@resonance/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WeaveInterviewRail } from "./weave-interview-rail";

const transcript: InterviewMessage[] = [
  { role: "assistant", content: "Hi, I'm Weave. What do you make?" },
  { role: "user", content: "Hand-thrown ceramics." },
];

const noop = () => {};

describe("WeaveInterviewRail", () => {
  it("renders the Weave header", () => {
    render(<WeaveInterviewRail messages={transcript} onSend={noop} />);
    expect(screen.getByRole("region", { name: "Weave interview" })).toBeInTheDocument();
    expect(screen.getByText("Weave")).toBeInTheDocument();
  });

  it("renders user and assistant turns, distinguished by role", () => {
    const { container } = render(<WeaveInterviewRail messages={transcript} onSend={noop} />);
    expect(screen.getByText("Hi, I'm Weave. What do you make?")).toBeInTheDocument();
    expect(screen.getByText("Hand-thrown ceramics.")).toBeInTheDocument();
    expect(container.querySelectorAll('[data-role="assistant"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-role="user"]')).toHaveLength(1);
  });

  it("submits the trimmed text via the send button and clears the composer", () => {
    const onSend = vi.fn();
    render(<WeaveInterviewRail messages={transcript} onSend={onSend} />);
    const field = screen.getByRole("textbox", { name: "Talk to Weave" });

    fireEvent.change(field, { target: { value: "  I sell mugs and bowls  " } });
    fireEvent.click(screen.getByRole("button", { name: "Send to Weave" }));

    expect(onSend).toHaveBeenCalledWith("I sell mugs and bowls");
    expect(field).toHaveValue("");
  });

  it("submits on Enter (form submit)", () => {
    const onSend = vi.fn();
    render(<WeaveInterviewRail messages={transcript} onSend={onSend} />);
    const field = screen.getByRole("textbox", { name: "Talk to Weave" });

    fireEvent.change(field, { target: { value: "Ready" } });
    fireEvent.submit(field);

    expect(onSend).toHaveBeenCalledWith("Ready");
  });

  it("does not send empty or whitespace-only input", () => {
    const onSend = vi.fn();
    render(<WeaveInterviewRail messages={transcript} onSend={onSend} />);
    const field = screen.getByRole("textbox", { name: "Talk to Weave" });

    fireEvent.change(field, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Send to Weave" }));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("shows a typing indicator only while streaming", () => {
    const { rerender } = render(<WeaveInterviewRail messages={transcript} onSend={noop} />);
    expect(screen.queryByRole("status", { name: "Weave is typing" })).not.toBeInTheDocument();

    rerender(<WeaveInterviewRail messages={transcript} onSend={noop} streaming />);
    expect(screen.getByRole("status", { name: "Weave is typing" })).toBeInTheDocument();
  });

  it("disables the composer when disabled", () => {
    render(<WeaveInterviewRail messages={transcript} onSend={noop} disabled />);
    expect(screen.getByRole("textbox", { name: "Talk to Weave" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send to Weave" })).toBeDisabled();
  });

  const startPrompt = { body: "Hi — I'm glad you're here.", question: "Would you like to begin?" };

  it("renders the start-state opener and controls in place of the transcript", () => {
    render(
      <WeaveInterviewRail
        messages={[]}
        onSend={noop}
        showStart
        startPrompt={startPrompt}
        onBegin={noop}
        onDeferLater={noop}
      />,
    );
    expect(screen.getByText(/I'm glad you're here/)).toBeInTheDocument();
    expect(screen.getByText("Would you like to begin?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes let's begin" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I want do it later" })).toBeInTheDocument();
  });

  it("fires onBegin and onDeferLater from the start-state controls", () => {
    const onBegin = vi.fn();
    const onDeferLater = vi.fn();
    render(
      <WeaveInterviewRail
        messages={[]}
        onSend={noop}
        showStart
        startPrompt={startPrompt}
        onBegin={onBegin}
        onDeferLater={onDeferLater}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes let's begin" }));
    fireEvent.click(screen.getByRole("button", { name: "I want do it later" }));
    expect(onBegin).toHaveBeenCalledTimes(1);
    expect(onDeferLater).toHaveBeenCalledTimes(1);
  });

  it("hides the bottom composer when showComposer is false", () => {
    render(<WeaveInterviewRail messages={transcript} onSend={noop} showComposer={false} />);
    expect(screen.queryByRole("textbox", { name: "Talk to Weave" })).not.toBeInTheDocument();
  });
});
