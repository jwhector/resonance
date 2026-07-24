import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IntentForm } from "./intent-form";

// `next/navigation` is mocked because App Router's `useRouter` needs a mounted router context.
const routerPush = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }));

afterEach(() => routerPush.mockReset());

describe("IntentForm", () => {
  it("routes the two creator intents to /signup", () => {
    render(<IntentForm />);
    fireEvent.click(screen.getByRole("radio", { name: "I want to share my works" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(routerPush).toHaveBeenCalledWith("/signup");
  });

  it("routes the business intent to /signup", () => {
    render(<IntentForm />);
    fireEvent.click(
      screen.getByRole("radio", {
        name: "I have a business, and I want to connect with customers",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(routerPush).toHaveBeenCalledWith("/signup");
  });

  it("routes the member (explore) intent to the home placeholder", () => {
    render(<IntentForm />);
    fireEvent.click(screen.getByRole("radio", { name: "I'm exploring/ buying" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(routerPush).toHaveBeenCalledWith("/");
  });
});
