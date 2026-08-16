"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { OnboardingIntent } from "@resonance/core";
import { CreateAccountCard, type CreateAccountValues } from "@resonance/ui";
import { authClient } from "../../../lib/auth-client";
import { interestsUrl, verifyUrl } from "../intent-routes";

export interface SignupFormProps {
  /** What this person said they came here to do, if they arrived by way of `/start`. */
  intent?: OnboardingIntent;
}

/**
 * Client wrapper over the presentational `CreateAccountCard`. On submit it dispatches BOTH
 * sign-in emails through the Better Auth browser client — the magic link and the 6-digit
 * code — then routes to `/verify`, where the user can use either. Both are two independent
 * Better Auth plugins sending two independent emails (see `@resonance/auth`).
 *
 * The intent has to be handed to **both** channels here, and they take it differently: the magic
 * link only ever comes back through the `callbackURL` Better Auth is holding for it, while the
 * code is typed on `/verify`, which therefore needs the answer in its own URL. Thread one and not
 * the other and the destination silently depends on which email someone happened to open.
 */
export function SignupForm({ intent }: SignupFormProps) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit({ email }: CreateAccountValues) {
    setError(null);
    setPending(true);
    try {
      // Fire both channels for the one email. The magic-link callback and the OTP verify
      // both create the same session and land on the same destination.
      const [linkResult, otpResult] = await Promise.all([
        authClient.signIn.magicLink({ email, callbackURL: interestsUrl(intent) }),
        authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" }),
      ]);
      if (linkResult.error || otpResult.error) {
        setError("We couldn't send your sign-in email. Please try again.");
        return;
      }
      router.push(verifyUrl(email, intent));
    } catch {
      setError("Something went wrong sending your sign-in email. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <CreateAccountCard
        onSubmit={handleSubmit}
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
