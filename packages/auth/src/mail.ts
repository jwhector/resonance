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

// --- Mail observation seam (test/E2E only, inert in production) -----------------------
//
// Passive read-back slots for what a *test-injected* fake transport captured — the login codes it
// was asked to send, and the magic links. Runtime code NEVER writes here. Registration is EXPLICIT
// and opt-in: the E2E harness calls `observeMail(fake)` (from `@resonance/auth/testing`) when it
// builds its singleton fake. Constructing a fake has NO side effect on these slots — so building a
// fake anywhere (a unit test, another package) can never hijack the read-back of another fake (no
// action-at-a-distance). A peek reads whatever buffer was explicitly registered; when nothing has
// been observed — which is ALWAYS the case in production, since production never builds a fake and
// never invokes the harness — it is inert (returns undefined) and can never leak a real code or link.
//
// Defense-in-depth: every peek ALSO hard-returns undefined when `NODE_ENV === "production"`,
// independent of registration. Two unrelated reasons nothing can surface in prod: nothing is ever
// registered there, AND the prod guard short-circuits the read (the isolated E2E harness only ever
// runs with `NODE_ENV !== "production"`, so this never impairs the legitimate read-back).
//
// The slots are pinned to `globalThis` because in Next.js dev / route-handler bundles
// `@resonance/auth` can evaluate in more than one module scope — the Better Auth catch-all
// that WRITES and the test route that READS — and a plain module-level `const` would give each
// scope its own buffer. A process-wide slot guarantees the write and the read land on the same array.
//
// Both kinds share one slot implementation rather than each keeping a copy of this reasoning: the
// production guard and the cross-scope pinning are subtle enough that a second hand-rolled copy is
// how one of them silently loses a guard.
//
// This is NOT a runtime fake selector (ADR-0018): it selects nothing and dispatches no mail;
// it only exposes what a DI-injected fake already captured. Final disposition of this seam
// and the test routes that read it is a separate, human-gated decision.

/** One `globalThis`-pinned observation slot: the register / clear / read trio, defined once. */
function observationSlot<T>(key: string) {
  const store = () => globalThis as unknown as Record<string, ReadonlyArray<T> | undefined>;
  return {
    register: (entries: ReadonlyArray<T>) => {
      store()[key] = entries;
    },
    clear: () => {
      store()[key] = undefined;
    },
    /** The most recent entry matching `match`, or `undefined`. Inert in production. */
    findLast: (match: (entry: T) => boolean): T | undefined => {
      if (process.env.NODE_ENV === "production") return undefined;
      const entries = store()[key];
      if (!entries) return undefined;
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry !== undefined && match(entry)) return entry;
      }
      return undefined;
    },
  };
}

type ObservedLoginCode = { email: string; otp: string; type: OtpType };
type ObservedMagicLink = { email: string; url: string; token: string };

const loginCodes = observationSlot<ObservedLoginCode>("__resonance_auth_observed_login_codes__");
const magicLinks = observationSlot<ObservedMagicLink>("__resonance_auth_observed_magic_links__");

/**
 * Register the buffers a test-injected fake captures into, so the peeks below can read them back
 * across module scopes. This is the low-level writer; the E2E harness calls it via the
 * intent-named `observeMail(fake)` on `@resonance/auth/testing`. Both buffers are registered
 * together because they come from the one transport — registering them separately would let a
 * harness observe half the flow and discover the gap only when a test asks for the other half.
 *
 * Registration is always explicit and test/harness-driven — nothing on a shipped runtime path ever
 * calls it, and it is NOT re-exported from the package entrypoint (kept internal to the testing seam).
 */
export function registerObservedMail(observed: {
  codes: ReadonlyArray<ObservedLoginCode>;
  sent: ReadonlyArray<ObservedMagicLink>;
}): void {
  loginCodes.register(observed.codes);
  magicLinks.register(observed.sent);
}

/**
 * Clear both observation slots. Test-only hygiene so a suite can assert the inert (nothing
 * registered) shape deterministically. Not re-exported from the package entrypoint.
 */
export function clearObservedMail(): void {
  loginCodes.clear();
  magicLinks.clear();
}

/**
 * Dev/test-only read-back: the most recent login code observed for `email`, or `undefined`.
 * Reads the buffer a fake transport was EXPLICITLY registered for via {@link registerObservedMail}
 * (the harness calls `observeMail(fake)`). Returns `undefined` when no fake has been observed —
 * which is always the case in production, since nothing constructs a fake or invokes the harness
 * there — so this never surfaces a real code. Do NOT wire it into any production code path.
 */
export function peekLoginCode(email: string): string | undefined {
  return loginCodes.findLast((entry) => entry.email === email)?.otp;
}

/**
 * Dev/test-only read-back: the most recent magic-link URL observed for `email`, or `undefined`.
 * The same seam and the same guards as {@link peekLoginCode}.
 *
 * This exists because the magic link, unlike the code, has no other way to be read: the link is
 * only ever delivered by email, and Better Auth stores a SHA-256 hash of its token rather than the
 * token itself, so the URL cannot be reconstructed from the database. Without this a test can
 * drive only one of the two verification channels.
 */
export function peekMagicLink(email: string): string | undefined {
  return magicLinks.findLast((entry) => entry.email === email)?.url;
}
