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

const devFake = createFakeMail();

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
  if (process.env.RESONANCE_FAKES === "1") return devFake.port;
  return stubAuthMail;
}
