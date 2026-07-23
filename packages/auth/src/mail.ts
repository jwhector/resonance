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
 * transport instance, so a single fake captures both in tests.
 *
 * Kept local to this package (not promoted to `@resonance/core`) because the OTP
 * send is an auth concern only — core ports are earned by 2+ packages.
 */
export type AuthMailPort = MailPort & {
  sendLoginCode(args: { email: string; otp: string; type: OtpType }): Promise<void>;
};

/**
 * Fail-closed stub: both send paths reject when no live transport is configured, so a
 * missing `RESEND_API_KEY` degrades **explicitly** (an error on send) instead of silently
 * no-oping. This is the live-by-default fallback — never a fake selected by an env flag
 * (ADR-0018). Tests never reach it; they inject `createFakeMail()` from
 * `@resonance/auth/testing` through `createAuth({ mail })`.
 */
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
        <p style="margin:0 0 4px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#6034ff;font-weight:600">Resonance</p>
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
     <a href="${url}" style="display:inline-block;background:#6034ff;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px">Sign in</a>
     <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#868686">Or paste this link into your browser:<br><a href="${url}" style="color:#6034ff;word-break:break-all">${url}</a></p>`,
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
 * Select the mail transport, **live-by-default** (ADR-0018): the live Resend transport when
 * `RESEND_API_KEY` is set, else the fail-closed stub — which throws on send, degrading
 * explicitly rather than silently faking. There is no `RESONANCE_FAKES` branch: tests never
 * call this; they inject `createFakeMail()` (from `@resonance/auth/testing`) through
 * `createAuth({ mail })`.
 */
export function resolveMail(): AuthMailPort {
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    return createResendMail({ apiKey, from: process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM });
  }
  return stubAuthMail;
}

// --- OTP observation seam (test/E2E only, inert in production) ------------------------
//
// A passive read-back slot for the login codes a *test-injected* fake transport captures.
// Runtime code NEVER writes here. Registration is EXPLICIT and opt-in: the E2E harness calls
// `observeLoginCodes(fake)` (from `@resonance/auth/testing`) when it builds its singleton fake.
// Constructing a fake has NO side effect on this slot — so building a fake anywhere (a unit
// test, another package) can never hijack the read-back of another fake (no action-at-a-distance).
// `peekLoginCode` reads whatever buffer was explicitly registered; when nothing has been observed —
// which is ALWAYS the case in production, since production never builds a fake and never invokes the
// harness — it is inert (returns undefined) and can never leak a real code.
//
// Defense-in-depth: `peekLoginCode` ALSO hard-returns undefined when `NODE_ENV === "production"`,
// independent of registration. Two unrelated reasons it cannot surface a code in prod: nothing is
// ever registered there, AND the prod guard short-circuits the read (the isolated E2E harness only
// ever runs with `NODE_ENV !== "production"`, so this never impairs the legitimate read-back).
//
// The slot is pinned to `globalThis` because in Next.js dev / route-handler bundles
// `@resonance/auth` can evaluate in more than one module scope — the Better Auth catch-all
// that WRITES the code and the route that READS it via `peekLoginCode` — and a plain
// module-level `const` would give each scope its own buffer. A process-wide slot guarantees
// the write and the read land on the same array.
//
// This is NOT a runtime fake selector (ADR-0018): it selects nothing and dispatches no mail;
// it only exposes codes a DI-injected fake already captured. Final disposition of this seam
// and the `/api/test/last-otp` route is a separate, human-gated decision (seed resonance-a4a4).
type ObservedLoginCodes = ReadonlyArray<{ email: string; otp: string; type: OtpType }>;
const OBSERVED_CODES_KEY = "__resonance_auth_observed_login_codes__";

function observedCodesStore(): Record<string, ObservedLoginCodes | undefined> {
  return globalThis as unknown as Record<string, ObservedLoginCodes | undefined>;
}

/**
 * Register the login-code buffer a test-injected fake captures into, so {@link peekLoginCode}
 * can read it back across module scopes. This is the low-level writer; the E2E harness calls it
 * via the intent-named `observeLoginCodes(fake)` on `@resonance/auth/testing`. Registration is
 * always explicit and test/harness-driven — nothing on a shipped runtime path ever calls it, and
 * it is NOT re-exported from the package entrypoint (kept internal to the testing seam).
 */
export function registerObservedLoginCodes(codes: ObservedLoginCodes): void {
  observedCodesStore()[OBSERVED_CODES_KEY] = codes;
}

/**
 * Clear the observation slot. Test-only hygiene so a suite can assert the inert (nothing
 * registered) shape deterministically. Not re-exported from the package entrypoint.
 */
export function clearObservedLoginCodes(): void {
  observedCodesStore()[OBSERVED_CODES_KEY] = undefined;
}

/**
 * Dev/test-only read-back: the most recent login code observed for `email`, or `undefined`.
 * Reads the buffer a fake transport was EXPLICITLY registered for via
 * {@link registerObservedLoginCodes} (the harness calls `observeLoginCodes(fake)`). Returns
 * `undefined` when no fake has been observed — which is always the case in production, since nothing
 * constructs a fake or invokes the harness there — so this never surfaces a real code. As
 * defense-in-depth it ALSO returns `undefined` whenever `NODE_ENV === "production"`, regardless of
 * registration. Do NOT wire it into any production code path.
 */
export function peekLoginCode(email: string): string | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  const codes = observedCodesStore()[OBSERVED_CODES_KEY];
  if (!codes) return undefined;
  for (let i = codes.length - 1; i >= 0; i--) {
    const entry = codes[i];
    if (entry?.email === email) return entry.otp;
  }
  return undefined;
}
