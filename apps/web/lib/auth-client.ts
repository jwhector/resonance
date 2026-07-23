"use client";

import { createAuthClient } from "better-auth/react";
import { emailOTPClient, magicLinkClient } from "better-auth/client/plugins";

/**
 * Browser Better Auth client for the sign-in cookie flow.
 *
 * We use the client (not web Server Actions) for sign-in because it is the flow Better
 * Auth's Next.js App Router guidance recommends: the client calls the plugin routes that
 * `@resonance/auth` auto-mounts under the `/api/auth/[...all]` catch-all, and the browser
 * transparently persists the `Set-Cookie` session on the OTP verify response. A Server
 * Action would have to re-plumb that cookie by hand. The catch-all handler itself lives at
 * `app/api/auth/[...all]/route.ts` (Context7: better-auth v1.6 App Router installation).
 *
 * The client mirrors the server plugin set in `@resonance/auth` (magic-link + emailOTP):
 * - `signIn.magicLink({ email, callbackURL })` — emails the magic link.
 * - `emailOtp.sendVerificationOtp({ email, type: "sign-in" })` — emails the 6-digit code.
 * - `signIn.emailOtp({ email, otp })` — verifies the code and creates the session cookie.
 *
 * `baseURL` is left to the default (same-origin `/api/auth`), which is where the handler is
 * mounted. This module is client-only, so no provider secret is ever involved here.
 */
export const authClient = createAuthClient({
  plugins: [magicLinkClient(), emailOTPClient()],
});
