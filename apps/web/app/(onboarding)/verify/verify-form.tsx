"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { EmailVerifyCard } from "@resonance/ui";
import { authClient } from "../../../lib/auth-client";

/** Session destination shared with the magic-link callback (see `signup-form`). */
const AFTER_VERIFY = "/onboarding/creator";

/**
 * Client wrapper over the presentational `EmailVerifyCard`. The OTP path verifies the code
 * via Better Auth's emailOTP sign-in (which sets the session cookie on its response) and then
 * routes to the creator interview; the magic-link path is handled entirely by Better Auth's
 * callback, which lands on the same destination. "Try again" re-sends both channels.
 */
export function VerifyForm({ email }: { email: string }) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(code: string) {
    setError(null);
    setPending(true);
    try {
      const result = await authClient.signIn.emailOtp({ email, otp: code });
      if (result.error) {
        setError("That code didn't work. Check it and try again, or resend.");
        return;
      }
      router.push(AFTER_VERIFY);
    } catch {
      setError("We couldn't verify that code. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function handleResend() {
    setError(null);
    try {
      await Promise.all([
        authClient.signIn.magicLink({ email, callbackURL: AFTER_VERIFY }),
        authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" }),
      ]);
    } catch {
      setError("We couldn't resend your sign-in email. Please try again.");
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <EmailVerifyCard
        email={email}
        onSubmit={handleSubmit}
        onResend={handleResend}
        aria-busy={pending}
        className={pending ? "pointer-events-none opacity-70" : undefined}
      />
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
