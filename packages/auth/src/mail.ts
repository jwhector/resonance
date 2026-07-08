import { type MailPort, NotImplementedError, stubMail } from "@resonance/core";
import { Resend } from "resend";

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

/** Fail-closed stub: both send paths reject when no live transport is configured
 *  and fakes are off, so nothing silently no-ops in production. */
const stubAuthMail: AuthMailPort = {
  ...stubMail,
  sendLoginCode() {
    return Promise.reject(new NotImplementedError("AuthMailPort.sendLoginCode"));
  },
};

// --- Live transport (Resend + branded HTML, ADR-0005) --------------------------------

/** Shared, email-client-safe HTML shell (inline styles only — email clients strip <style>). */
function emailShell(heading: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f2f2f2;padding:24px;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#2b2b2b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden">
      <tr><td style="height:6px;background:linear-gradient(90deg,#22d3ee,#6366f1,#a855f7,#ec4899,#f97316,#facc15)"></td></tr>
      <tr><td style="padding:32px 40px">
        <p style="margin:0 0 4px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#a855f7;font-weight:600">Resonance</p>
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#2b2b2b">${heading}</h1>
        ${bodyHtml}
        <p style="margin:24px 0 0;font-size:12px;color:#a6a6a6">If you didn't request this, you can safely ignore this email.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

function magicLinkEmailHtml(url: string): string {
  return emailShell(
    "Sign in to Resonance",
    `<p style="margin:0 0 24px;font-size:15px;line-height:1.6">Click the button below to sign in. This link expires shortly and can be used once.</p>
     <a href="${url}" style="display:inline-block;background:#a855f7;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px">Sign in</a>
     <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#868686">Or paste this link into your browser:<br><a href="${url}" style="color:#7e22ce;word-break:break-all">${url}</a></p>`,
  );
}

function otpEmailHtml(otp: string): string {
  return emailShell(
    "Your sign-in code",
    `<p style="margin:0 0 20px;font-size:15px;line-height:1.6">Enter this 6-digit code to continue. It expires shortly.</p>
     <div style="font-size:34px;font-weight:700;letter-spacing:.4em;color:#2b2b2b;background:#f2f2f2;border-radius:12px;padding:16px 8px;text-align:center">${otp}</div>`,
  );
}

/**
 * Live transactional mail via Resend (ADR-0005). Activated by {@link resolveMail} when
 * `RESEND_API_KEY` is present. `from` must be a verified sender; Resend's test sender
 * `onboarding@resend.dev` can only deliver to the Resend account owner's own address.
 * Errors are propagated (not swallowed) so Better Auth surfaces a failed send.
 */
export function createResendMail(opts: { apiKey: string; from: string }): AuthMailPort {
  const resend = new Resend(opts.apiKey);
  return {
    async sendMagicLink({ email, url }) {
      const { error } = await resend.emails.send({
        from: opts.from,
        to: [email],
        subject: "Sign in to Resonance",
        html: magicLinkEmailHtml(url),
      });
      if (error) throw new Error(`Resend failed to send magic link: ${error.message}`);
    },
    async sendLoginCode({ email, otp }) {
      const { error } = await resend.emails.send({
        from: opts.from,
        to: [email],
        subject: `Your Resonance sign-in code: ${otp}`,
        html: otpEmailHtml(otp),
      });
      if (error) throw new Error(`Resend failed to send login code: ${error.message}`);
    },
  };
}

/** Default sender — Resend's shared test address, which needs no domain verification but
 *  only delivers to the Resend account owner. Override with `RESEND_FROM_EMAIL` once a
 *  domain is verified. */
const DEFAULT_FROM = "Resonance <onboarding@resend.dev>";

/**
 * Select the mail transport, per-seam by key presence (ADR-0016): live Resend when
 * `RESEND_API_KEY` is set — so live email works even while the AI seams stay faked — else
 * the in-memory fake under `RESONANCE_FAKES=1`, else the fail-closed stub.
 */
export function resolveMail(): AuthMailPort {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    return createResendMail({ apiKey, from: process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM });
  }
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
 * the active transport (Resend or the stub is), so there is never a real code to leak. Do NOT
 * wire this into any production code path.
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
