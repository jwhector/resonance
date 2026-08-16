import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { VerifyForm } from "./verify-form";

/**
 * This screen is the second of the two verification channels, and it is where they can quietly
 * diverge: entering the code routes onward from here, while the magic link routes from a
 * `callbackURL` handed to Better Auth. Both are asserted separately below, including the link a
 * **resend** issues — a resent link is the one most likely to be built from stale arguments.
 */

const emailOtp = vi.fn();
const magicLink = vi.fn();
const sendVerificationOtp = vi.fn();
const routerPush = vi.fn();

// `next/navigation` is mocked because App Router's `useRouter` needs a mounted router context.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }));
vi.mock("../../../lib/auth-client", () => ({
  authClient: {
    signIn: {
      emailOtp: (args: unknown) => emailOtp(args),
      magicLink: (args: unknown) => magicLink(args),
    },
    emailOtp: { sendVerificationOtp: (args: unknown) => sendVerificationOtp(args) },
  },
}));

const EMAIL = "member@example.com";
const CODE = "123456";

afterEach(() => {
  vi.clearAllMocks();
});

/** Type the six digits and press Continue, the way someone with the code does. */
async function enterCode() {
  emailOtp.mockResolvedValue({ error: null });

  for (let i = 0; i < CODE.length; i++) {
    fireEvent.change(screen.getByLabelText(`Digit ${i + 1} of 6`), {
      target: { value: CODE[i] },
    });
  }
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  await waitFor(() => expect(routerPush).toHaveBeenCalled());
}

describe("VerifyForm", () => {
  it("carries a creator intent onward when the code is what verified the account", async () => {
    render(<VerifyForm email={EMAIL} intent="share" />);
    await enterCode();

    expect(emailOtp).toHaveBeenCalledWith({ email: EMAIL, otp: CODE });
    expect(routerPush).toHaveBeenCalledWith("/interests?intent=share");
  });

  it("keeps the intent in the callback of a resent magic link", async () => {
    magicLink.mockResolvedValue({ error: null });
    sendVerificationOtp.mockResolvedValue({ error: null });
    render(<VerifyForm email={EMAIL} intent="business" />);

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() =>
      expect(magicLink).toHaveBeenCalledWith({
        email: EMAIL,
        callbackURL: "/interests?intent=business",
      }),
    );
  });

  it("goes to plain interest selection when no intent was stated", async () => {
    render(<VerifyForm email={EMAIL} />);
    await enterCode();

    expect(routerPush).toHaveBeenCalledWith("/interests");
  });
});
