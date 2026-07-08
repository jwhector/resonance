import { getWebAuth } from "../../../../lib/auth";

/**
 * Better Auth catch-all handler. Every auth route — magic-link request/verify, emailOTP
 * `send-verification-otp` / `sign-in/email-otp`, and session — is served here by the
 * instance's own `(Request) => Response` handler (ADR-0005). `getWebAuth()` builds the instance
 * lazily, so importing this module does not require `DATABASE_URL` at build time.
 *
 * `getWebAuth()` returns the live `getAuth()` singleton by default; under the isolated E2E harness
 * (ADR-0018 §4, never in production) it returns an instance whose mail is the in-memory fake, so
 * the deterministic OTP E2E can read codes back — see `lib/auth.ts` + `lib/e2e-harness.ts`.
 *
 * No `better-auth` import is needed in web for the mount itself: the instance already carries
 * its handler (Context7: better-auth v1.6 App Router — the Expo-style `auth.handler(request)`
 * mount, equivalent to `toNextJsHandler`, but without adding a web-side dependency for it).
 */
const handler = (request: Request): Response | Promise<Response> => getWebAuth().handler(request);

export { handler as GET, handler as POST };
