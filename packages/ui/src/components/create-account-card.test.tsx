import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreateAccountCard } from "./create-account-card";

const noop = () => {};

describe("CreateAccountCard", () => {
  it("renders the heading, email field, and consent checkbox", () => {
    render(<CreateAccountCard onSubmit={noop} />);
    expect(screen.getByRole("heading", { name: "Welcome to Resonance" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("renders a custom consent label when provided", () => {
    render(<CreateAccountCard onSubmit={noop} consentLabel="Accept the rules" />);
    expect(screen.getByRole("checkbox", { name: "Accept the rules" })).toBeInTheDocument();
  });

  it("keeps submit disabled until an email is entered and consent is given", () => {
    render(<CreateAccountCard onSubmit={noop} />);
    const submit = screen.getByRole("button", { name: "Create account" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    expect(submit).toBeDisabled(); // still no consent

    fireEvent.click(screen.getByRole("checkbox"));
    expect(submit).toBeEnabled();
  });

  it("submits the trimmed email and consent flag", () => {
    const onSubmit = vi.fn();
    render(<CreateAccountCard onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "  creator@example.com  " },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(onSubmit).toHaveBeenCalledWith({ email: "creator@example.com", consent: true });
  });

  it("does not submit while the consent checkbox is unchecked", () => {
    const onSubmit = vi.fn();
    render(<CreateAccountCard onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "a@b.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
