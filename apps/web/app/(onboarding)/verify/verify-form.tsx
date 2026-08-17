"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { OnboardingIntent } from "@resonance/core";
import { EmailVerifyCard } from "@resonance/ui";
import { authClient } from "../../../lib/auth-client";
import { interestsUrl } from "../intent-routes";

export interface VerifyFormProps {
  email: string;
  /** What this person said they came here to do, carried from `/start` through sign-up. */
  intent?: OnboardingIntent;
}

/**
 * Client wrapper over the presentational `EmailVerifyCard`. The OTP path verifies the code
 * via Better Auth's emailOTP sign-in (which sets the session cookie on its response) and then
 * routes to interest selection; the magic-link path is handled entirely by Better Auth's
 * callback, which lands on the same destination. "Try again" re-sends both channels.
 *
 * Both of this screen's paths onward carry the intent: the code sign-in, and the magic link a
 * resend puts back in the inbox. Anyone verifying here reaches the same fork with the same answer
 * as anyone who clicked the first link.
 */
export function VerifyForm({ email, intent }: VerifyFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);
  const afterVerify = interestsUrl(intent);

  async function handleSubmit(code: string) {
    setError(null);
    setPending(true);
    try {
      const result = await authClient.signIn.emailOtp({ email, otp: code });
      if (result.error) {
        setError("That code didn't work. Check it and try again, or resend.");
        return;
      }
      router.push(afterVerify);
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
        authClient.signIn.magicLink({ email, callbackURL: afterVerify }),
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
