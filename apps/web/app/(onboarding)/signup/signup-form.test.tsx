import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "./signup-form";

/**
 * Sign-up dispatches two independent emails and then hands off to a screen that only one of them
 * needs. The intent has to reach both, and the two carry it by different means — the magic link
 * through the `callbackURL` Better Auth stores against the token, the code through the URL of the
 * screen it is typed on. Each test below therefore asserts **per channel**: a single assertion
 * that "the intent was passed" would pass while one of the two paths silently lost it.
 */

const magicLink = vi.fn();
const sendVerificationOtp = vi.fn();
const routerPush = vi.fn();

// `next/navigation` is mocked because App Router's `useRouter` needs a mounted router context.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock("../../../lib/auth-client", () => ({
  authClient: {
    signIn: { magicLink: (args: unknown) => magicLink(args) },
    emailOtp: { sendVerificationOtp: (args: unknown) => sendVerificationOtp(args) },
  },
}));

const EMAIL = "member@example.com";

afterEach(() => {
  vi.clearAllMocks();
});

/** Fill the form the way someone does and press Continue. */
async function submit(email = EMAIL) {
  magicLink.mockResolvedValue({ error: null });
  sendVerificationOtp.mockResolvedValue({ error: null });

  fireEvent.change(screen.getByLabelText("Email"), { target: { value: email } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  await waitFor(() => expect(routerPush).toHaveBeenCalled());
}

describe("SignupForm", () => {
  it("puts a creator intent in the magic link's callback", async () => {
    render(<SignupForm intent="share" />);
    await submit();

    expect(magicLink).toHaveBeenCalledWith({
      email: EMAIL,
      callbackURL: "/interests?intent=share",
    });
  });

  it("puts the same creator intent in the URL of the code-entry screen", async () => {
    render(<SignupForm intent="share" />);
    await submit();

    expect(routerPush).toHaveBeenCalledWith("/verify?email=member%40example.com&intent=share");
  });

  it("sends both channels to plain interest selection when no intent was stated", async () => {
    render(<SignupForm />);
    await submit();

    expect(magicLink).toHaveBeenCalledWith({ email: EMAIL, callbackURL: "/interests" });
    expect(routerPush).toHaveBeenCalledWith("/verify?email=member%40example.com");
  });

  it("still dispatches both emails and routes on when an intent is stated", async () => {
    // The intent rides along with sign-up; it must not become a second thing that can fail it.
    render(<SignupForm intent="business" />);
    await submit();

    expect(sendVerificationOtp).toHaveBeenCalledWith({ email: EMAIL, type: "sign-in" });
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
