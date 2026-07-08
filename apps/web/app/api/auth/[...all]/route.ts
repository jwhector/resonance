import { getAuth } from "@resonance/auth";

/**
 * Better Auth catch-all handler. Every auth route — magic-link request/verify, emailOTP
 * `send-verification-otp` / `sign-in/email-otp`, and session — is served here by the
 * instance's own `(Request) => Response` handler (ADR-0005). `getAuth()` builds the instance
 * lazily, so importing this module does not require `DATABASE_URL` at build time.
 *
 * No `better-auth` import is needed in web for the mount itself: the instance already carries
 * its handler (Context7: better-auth v1.6 App Router — the Expo-style `auth.handler(request)`
 * mount, equivalent to `toNextJsHandler`, but without adding a web-side dependency for it).
 */
const handler = (request: Request): Response | Promise<Response> => getAuth().handler(request);

export { handler as GET, handler as POST };
