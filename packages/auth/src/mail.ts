import { type MailPort, NotImplementedError, stubMail } from "@resonance/core";

/**
 * Purpose of a one-time login code. Mirrors Better Auth's emailOTP `type` union
 * without importing it — the seam stays decoupled from Better Auth internals.
 */
export type OtpType = "sign-in" | "email-verification" | "forget-password" | "change-email";

/**
 * The mail seam used by @resonance/auth. A superset of the core `MailPort`:
 * magic-link dispatches through `sendMagicLink`; the emailOTP capability
 * dispatches the 6-digit code through `sendLoginCode`. Both go through the SAME
 * transport instance, so a single fake captures both in tests/dev.
 *
 * Kept local to this package (not promoted to `@resonance/core`) because the OTP
 * send is an auth concern only — core ports are earned by 2+ packages.
 */
export type AuthMailPort = MailPort & {
  sendLoginCode(args: { email: string; otp: string; type: OtpType }): Promise<void>;
};

export function createFakeMail(): {
  port: AuthMailPort;
  sent: Array<{ email: string; url: string; token: string }>;
  codes: Array<{ email: string; otp: string; type: OtpType }>;
} {
  const sent: Array<{ email: string; url: string; token: string }> = [];
  const codes: Array<{ email: string; otp: string; type: OtpType }> = [];
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
 * The fake transport is a PROCESS-wide singleton (pinned to `globalThis`), not a plain
 * module-level `const`. In Next.js dev / route-handler bundles `@resonance/auth` can be evaluated
 * in more than one module scope (the Better Auth catch-all that WRITES the code vs. a separate
 * route that READS it via `peekLoginCode`), and each scope would otherwise get its own capture
 * buffer — the write and read could land on different instances. A shared global buffer guarantees
 * one instance. Only the fake path (RESONANCE_FAKES) ever touches this; prod uses the stub. */
const DEV_FAKE_KEY = "__resonance_auth_dev_fake_mail__";
type DevFake = ReturnType<typeof createFakeMail>;
function devFakeMail(): DevFake {
  const store = globalThis as unknown as Record<string, DevFake | undefined>;
  return (store[DEV_FAKE_KEY] ??= createFakeMail());
}

/** Fail-closed stub: both send paths reject until the live Resend transport lands
 *  (Increment 3), so nothing silently no-ops in production. */
const stubAuthMail: AuthMailPort = {
  ...stubMail,
  sendLoginCode() {
    return Promise.reject(new NotImplementedError("AuthMailPort.sendLoginCode"));
  },
};

/** Select the mail transport. Fake under RESONANCE_FAKES; otherwise the stub
 *  (live Resend transport is wired with the sign-in UX in Increment 3). */
export function resolveMail(): AuthMailPort {
  if (process.env.RESONANCE_FAKES === "1") return devFakeMail().port;
  return stubAuthMail;
}

/**
 * Dev/test-only seam: read back the most recent login code the fake transport captured for
 * `email`. It reads the SAME process-wide fake transport `resolveMail()` hands out under
 * RESONANCE_FAKES, so it observes codes dispatched through the real auth flow — the E2E harness
 * uses it to complete the passwordless front door without a mailbox.
 *
 * Returns `undefined` unless `RESONANCE_FAKES === "1"`: outside the fakes flag the fake is not
 * the active transport (the stub is), so there is never a real code to leak. Do NOT wire this
 * into any production code path.
 */
export function peekLoginCode(email: string): string | undefined {
  if (process.env.RESONANCE_FAKES !== "1") return undefined;
  const codes = devFakeMail().codes;
  for (let i = codes.length - 1; i >= 0; i--) {
    const entry = codes[i];
    if (entry?.email === email) return entry.otp;
  }
  return undefined;
}
