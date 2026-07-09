import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EmailVerifyCard } from "./email-verify-card";

const noop = () => {};

function fillCode(code: string) {
  const cells = screen.getAllByRole("textbox");
  code.split("").forEach((digit, i) => {
    fireEvent.change(cells[i]!, { target: { value: digit } });
  });
}

describe("EmailVerifyCard", () => {
  it("renders the heading and the email in the body copy", () => {
    render(<EmailVerifyCard email="someone@resonance.app" onSubmit={noop} onResend={noop} />);
    expect(
      screen.getByRole("heading", { name: "Check your email to continue" }),
    ).toBeInTheDocument();
    // The address is interpolated inline (not emphasized) into the body sentence.
    expect(screen.getByText(/We've sent an email to someone@resonance\.app\./)).toBeInTheDocument();
  });

  it("renders a six-cell verification code group", () => {
    render(<EmailVerifyCard email="a@b.com" onSubmit={noop} onResend={noop} />);
    expect(screen.getByRole("group", { name: "Email verification code" })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  it("keeps Continue disabled until all six digits are entered", () => {
    render(<EmailVerifyCard email="a@b.com" onSubmit={noop} onResend={noop} />);
    const submit = screen.getByRole("button", { name: "Continue" });
    expect(submit).toBeDisabled();

    fillCode("12345");
    expect(submit).toBeDisabled();

    fillCode("123456");
    expect(submit).toBeEnabled();
  });

  it("calls onSubmit with the entered code", () => {
    const onSubmit = vi.fn();
    render(<EmailVerifyCard email="a@b.com" onSubmit={onSubmit} onResend={noop} />);

    fillCode("123456");
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onSubmit).toHaveBeenCalledWith("123456");
  });

  it("calls onResend when the retry link is clicked", () => {
    const onResend = vi.fn();
    render(<EmailVerifyCard email="a@b.com" onSubmit={noop} onResend={onResend} />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onResend).toHaveBeenCalledTimes(1);
  });
});
