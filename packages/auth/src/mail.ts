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

// --- Login-email observation seam (test/E2E only, inert in production) ----------------
//
// A passive read-back slot for what a *test-injected* fake transport captured: the login codes it
// was asked to mail, and the magic links. Runtime code NEVER writes here. Registration is EXPLICIT
// and opt-in — the E2E harness calls `observeLoginCodes(fake)` and `observeMagicLinks(fake)` (from
// `@resonance/auth/testing`) when it builds its singleton fake. Constructing a fake has NO side
// effect on either slot, so building a fake anywhere (a unit test, another package) can never
// hijack the read-back of another fake (no action-at-a-distance). A peek reads whatever buffer was
// explicitly registered; when nothing has been observed — which is ALWAYS the case in production,
// since production never builds a fake and never invokes the harness — it is inert and can surface
// neither a real code nor a real sign-in link.
//
// Defense-in-depth: a peek ALSO hard-returns undefined when `NODE_ENV === "production"`,
// independent of registration. Two unrelated reasons nothing can leak in prod: nothing is ever
// registered there, AND the prod guard short-circuits the read (the isolated E2E harness only ever
// runs with `NODE_ENV !== "production"`, so this never impairs the legitimate read-back).
//
// Both slots are pinned to `globalThis` because in Next.js dev / route-handler bundles
// `@resonance/auth` can evaluate in more than one module scope — the Better Auth catch-all that
// WRITES the email and the route that READS it back — and a plain module-level `const` would give
// each scope its own buffer. A process-wide slot guarantees the write and the read land on the
// same array.
//
// This is NOT a runtime fake selector (ADR-0018): it selects nothing and dispatches no mail; it
// only exposes what a DI-injected fake already captured.

/** What every observable send has in common — the address it was addressed to. */
type Addressed = { email: string };

/**
 * One process-wide observation slot.
 *
 * Both seams are built from this so they cannot drift apart in the four things that carry the
 * safety argument above: registration is explicit, the buffer is process-wide, production is
 * short-circuited, and a read answers with the *most recent* send to an address. Adding a third
 * observable send is then a one-line slot, not another copy of that argument.
 *
 * The returned object is per-module-scope; the buffer it addresses is per-process, which is the
 * whole point of the `globalThis` key.
 */
function observationSlot<T extends Addressed>(key: string) {
  const store = (): Record<string, ReadonlyArray<T> | undefined> =>
    globalThis as unknown as Record<string, ReadonlyArray<T> | undefined>;

  return {
    register(entries: ReadonlyArray<T>): void {
      store()[key] = entries;
    },
    clear(): void {
      store()[key] = undefined;
    },
    latestFor(email: string): T | undefined {
      if (process.env.NODE_ENV === "production") return undefined;
      const entries = store()[key];
      if (!entries) return undefined;
      for (let i = entries.length - 1; i >= 0; i--) {
        const entry = entries[i];
        if (entry?.email === email) return entry;
      }
      return undefined;
    },
  };
}

type ObservedLoginCodes = ReadonlyArray<{ email: string; otp: string; type: OtpType }>;
type ObservedMagicLinks = ReadonlyArray<{ email: string; url: string; token: string }>;

const observedLoginCodes = observationSlot<ObservedLoginCodes[number]>(
  "__resonance_auth_observed_login_codes__",
);

const observedMagicLinks = observationSlot<ObservedMagicLinks[number]>(
  "__resonance_auth_observed_magic_links__",
);

/**
 * Register the login-code buffer a test-injected fake captures into, so {@link peekLoginCode} can
 * read it back across module scopes. This is the low-level writer; the E2E harness calls it via the
 * intent-named `observeLoginCodes(fake)` on `@resonance/auth/testing`. Registration is always
 * explicit and test/harness-driven — nothing on a shipped runtime path ever calls it, and it is NOT
 * re-exported from the package entrypoint (kept internal to the testing seam).
 */
export function registerObservedLoginCodes(codes: ObservedLoginCodes): void {
  observedLoginCodes.register(codes);
}

/**
 * Register the magic-link buffer a test-injected fake captures into, so {@link peekMagicLink} can
 * read it back. The link's counterpart to {@link registerObservedLoginCodes}, and opt-in for the
 * same reason: the two channels are observed by the same fake but by two deliberate calls, so a
 * harness that wants only one gets only one.
 */
export function registerObservedMagicLinks(links: ObservedMagicLinks): void {
  observedMagicLinks.register(links);
}

/**
 * Clear the login-code slot. Test-only hygiene so a suite can assert the inert (nothing
 * registered) shape deterministically. Not re-exported from the package entrypoint.
 */
export function clearObservedLoginCodes(): void {
  observedLoginCodes.clear();
}

/** Clear the magic-link slot. Test-only hygiene, exactly as {@link clearObservedLoginCodes}. */
export function clearObservedMagicLinks(): void {
  observedMagicLinks.clear();
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
  return observedLoginCodes.latestFor(email)?.otp;
}

/**
 * Dev/test-only read-back: the most recent magic-link URL observed for `email`, or `undefined`.
 *
 * The link's counterpart to {@link peekLoginCode}, and it exists for the same reason that one does:
 * sign-up dispatches BOTH channels, so a test that can only read the code can only ever prove the
 * code's half of the flow. Where they differ is what the value carries — a code is a credential to
 * type, a link already carries the `callbackURL` the sender chose — which is precisely what makes
 * the link worth reading back: it is the only way to prove where that channel lands someone.
 *
 * Inert and prod-guarded identically. Do NOT wire it into any production code path.
 */
export function peekMagicLink(email: string): string | undefined {
  return observedMagicLinks.latestFor(email)?.url;
}
