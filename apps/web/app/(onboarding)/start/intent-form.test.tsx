import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntentForm } from "./intent-form";

// `next/navigation` is mocked because App Router's `useRouter` needs a mounted router context.
const routerPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }));

afterEach(() => routerPush.mockReset());

describe("IntentForm", () => {
  it("sends the share intent to /signup carrying its own answer", () => {
    render(<IntentForm />);
    fireEvent.click(screen.getByRole("radio", { name: "I want to share my works" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(routerPush).toHaveBeenCalledWith("/signup?intent=share");
  });

  it("keeps the business intent distinct from share rather than collapsing both to 'creator'", () => {
    render(<IntentForm />);
    fireEvent.click(
      screen.getByRole("radio", {
        name: "I have a business, and I want to connect with customers",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(routerPush).toHaveBeenCalledWith("/signup?intent=business");
  });

  it("routes the member (explore) intent to /discover, not through sign-up", () => {
    render(<IntentForm />);
    fireEvent.click(screen.getByRole("radio", { name: "I'm exploring/ buying" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    // `/discover` is session-optional, so the member front door needs no account (pl-bbca).
    expect(routerPush).toHaveBeenCalledWith("/discover");
  });
});
