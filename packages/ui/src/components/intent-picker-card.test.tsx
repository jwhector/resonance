import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { IntentPickerCard } from "./intent-picker-card";

const noop = () => {};

describe("IntentPickerCard", () => {
  it("renders the heading and the three intent options", () => {
    render(<IntentPickerCard onSubmit={noop} />);
    expect(
      screen.getByRole("heading", { name: "What brought you to here today?" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "I'm exploring/ buying" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "I want to share my works" })).toBeInTheDocument();
    expect(
      screen.getByRole("radio", {
        name: "I have a business, and I want to connect with customers",
      }),
    ).toBeInTheDocument();
  });

  it("keeps Next disabled until an option is selected", () => {
    render(<IntentPickerCard onSubmit={noop} />);
    const next = screen.getByRole("button", { name: "Next" });
    expect(next).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: "I want to share my works" }));
    expect(next).toBeEnabled();
  });

  it("submits the selected intent value", () => {
    const onSubmit = vi.fn();
    render(<IntentPickerCard onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("radio", { name: "I want to share my works" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(onSubmit).toHaveBeenCalledWith("share");
  });

  it("does not submit while no option is selected", () => {
    const onSubmit = vi.fn();
    render(<IntentPickerCard onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
