// Test-only mail double for @resonance/auth (ADR-0018).
//
// This is the in-memory fake transport tests inject via DI —
// `createAuth({ mail: createFakeMail().port })` — never selected by an env flag on a
// shipped runtime path. It lives on the `@resonance/auth/testing` subpath (mirroring
// `@resonance/db/testing`) so production code can never reach it.

import { type AuthMailPort, type OtpType, registerObservedLoginCodes } from "../mail";

/**
 * In-memory {@link AuthMailPort} that captures everything it is asked to send. `sent`
 * collects magic links, `codes` collects OTPs — both from the ONE transport, so a single
 * fake observes the whole auth flow. Inject it via `createAuth({ mail })` in tests.
 *
 * On construction the captured `codes` buffer is also registered as the process-wide OTP
 * observation source (see {@link registerObservedLoginCodes}), so `peekLoginCode(email)` —
 * imported from the package's main entry — reads back codes captured by THIS fake even
 * across Next.js route-handler module scopes. That read-back is what the deterministic E2E
 * OTP harness relies on (seed resonance-a4a4); it is inert in production because production
 * never constructs a fake, so nothing is ever registered.
 */
export function createFakeMail(): {
  port: AuthMailPort;
  sent: Array<{ email: string; url: string; token: string }>;
  codes: Array<{ email: string; otp: string; type: OtpType }>;
} {
  const sent: Array<{ email: string; url: string; token: string }> = [];
  const codes: Array<{ email: string; otp: string; type: OtpType }> = [];
  // Expose this fake's capture buffer to `peekLoginCode` for the DI-injected E2E read-back.
  registerObservedLoginCodes(codes);
  return {
    sent,
    codes,
    port: {
      async sendMagicLink(args) {
        sent.push(args);
        // Surface the link in dev so a human can click it without a mailbox.
        if (process.env.NODE_ENV !== "test") {
          console.info(`[fake-mail] magic link for ${args.email}: ${args.url}`);
        }
      },
      async sendLoginCode(args) {
        codes.push(args);
        // Surface the code in dev so a human can enter it without a mailbox.
        if (process.env.NODE_ENV !== "test") {
          console.info(`[fake-mail] login code for ${args.email}: ${args.otp}`);
        }
      },
    },
  };
}
