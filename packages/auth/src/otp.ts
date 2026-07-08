// @resonance/auth — thin server-side seam for the emailOTP capability.
//
// Wraps the Better Auth instance so callers (Server Actions / route handlers)
// trigger a login-code email without reaching into Better Auth internals. The
// send/verify HTTP endpoints (`/email-otp/send-verification-otp`, `/sign-in/
// email-otp`) are auto-mounted by the plugin for the browser client; this helper
// is for server-side dispatch (e.g. an onboarding Server Action).

import { z } from "zod";
import { getAuth } from "./auth";

// Validate at the boundary — `email` originates from client input (ADR-0006).
const EmailSchema = z.email();

/**
 * Send a 6-digit login code to `email` for the passwordless onboarding
 * email-verification screen. The code is dispatched through the same mail seam
 * as the magic link (see `AuthMailPort`). Server-only.
 *
 * Rejects if `email` is invalid, or if the mail transport is not configured
 * (fail-closed until the live transport lands in Increment 3).
 */
export async function requestLoginCode(email: string): Promise<void> {
  const parsed = EmailSchema.parse(email);
  await getAuth().api.sendVerificationOTP({
    body: { email: parsed, type: "sign-in" },
  });
}
