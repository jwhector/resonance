// Test-only mail double for @resonance/auth (ADR-0018).
//
// This is the in-memory fake transport tests inject via DI —
// `createAuth({ mail: createFakeMail().port })` — never selected by an env flag on a
// shipped runtime path. It lives on the `@resonance/auth/testing` subpath (mirroring
// `@resonance/db/testing`) so production code can never reach it.

import { type AuthMailPort, type OtpType, registerObservedMail } from "../mail";

/** The in-memory fake transport plus the buffers it captures into. */
export interface FakeMail {
  port: AuthMailPort;
  sent: Array<{ email: string; url: string; token: string }>;
  codes: Array<{ email: string; otp: string; type: OtpType }>;
}

/**
 * In-memory {@link AuthMailPort} that captures everything it is asked to send. `sent`
 * collects magic links, `codes` collects OTPs — both from the ONE transport, so a single
 * fake observes the whole auth flow. Inject it via `createAuth({ mail })` in tests.
 *
 * Construction has NO side effects: it does NOT touch the process-wide observation slots. A
 * caller that wants `peekLoginCode(email)` / `peekMagicLink(email)` to read this fake's captures
 * back (the deterministic E2E harness) must OPT IN explicitly by calling {@link observeMail} — so
 * constructing a fake anywhere can never hijack the read-back of another fake (no
 * action-at-a-distance).
 */
export function createFakeMail(): FakeMail {
  const sent: FakeMail["sent"] = [];
  const codes: FakeMail["codes"] = [];
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

/**
 * Explicitly register `fake`'s captures as the process-wide observation source, so
 * `peekLoginCode(email)` and `peekMagicLink(email)` (imported from the package's main entry) read
 * back what THIS fake captured — even across Next.js route-handler module scopes. This is the
 * deliberate opt-in the deterministic E2E harness (`apps/web/lib/e2e-harness.ts`) makes when it
 * builds its singleton fake; last call wins. Inert in production, which never builds a fake or
 * calls this. Kept opt-in (not a construction side-effect) so a fake built anywhere else cannot
 * silently take over the read-back.
 *
 * Both channels are observed by one call on purpose: a harness that opted into codes but not links
 * would drive only half the front door, and would look correct until a test needed the other half.
 */
export function observeMail(fake: Pick<FakeMail, "codes" | "sent">): void {
  registerObservedMail(fake);
}
