import { type Auth, createAuth, getAuth, getSession, type SessionUser } from "@resonance/auth";
import { createDb } from "@resonance/db";
import { harnessMailOverride } from "./e2e-harness";

/**
 * The auth instance the web shell serves from `app/api/auth/[...all]/route.ts` AND reads sessions
 * through (via {@link getWebSession}) — so there is exactly ONE Better Auth instance per process.
 *
 * Live `getAuth()` by default (mail → live Resend, ADR-0018). Under the E2E harness — and never in
 * production (see `e2e-harness.ts`) — it is instead an isolated instance built via the
 * `createAuth({ db, mail })` DI seam with the in-memory harness fake, so the passwordless flow
 * captures OTPs the `/api/test/last-otp` read-back can observe.
 *
 * Async because the harness fake mail is dynamically imported (kept out of the shipped bundle) and
 * importing this module never requires `DATABASE_URL` at build time. The secret is resolved by
 * `@resonance/auth` exactly as the live path does (the E2E boots with a fixed `BETTER_AUTH_SECRET`
 * from `playwright.config.ts`).
 *
 * The harness instance is pinned to `globalThis` (not a module-level `let`) so the mount and the
 * session reads share the SAME single instance even when Next.js evaluates this module in more than
 * one route/RSC scope (mulch failure mx-b19c21) — making "one instance per process" true rather
 * than "one per module scope". The live path is untouched: it returns the `@resonance/auth`
 * singleton directly and never populates this slot.
 */
const HARNESS_AUTH_KEY = "__resonance_web_harness_auth__";
function harnessAuthStore(): { [HARNESS_AUTH_KEY]?: Auth } {
  return globalThis as unknown as { [HARNESS_AUTH_KEY]?: Auth };
}

export async function getWebAuth(): Promise<Auth> {
  const mail = await harnessMailOverride();
  if (!mail) return getAuth();
  const store = harnessAuthStore();
  store[HARNESS_AUTH_KEY] ??= createAuth({ db: createDb(), mail });
  return store[HARNESS_AUTH_KEY]!;
}

/**
 * Resolve the current session through the SAME instance the auth mount serves ({@link getWebAuth}),
 * so exactly ONE Better Auth instance runs per process (seed resonance-eb15).
 *
 * Before this, session reads went through `@resonance/auth`'s `getSession` (the live `getAuth()`
 * singleton) while the mount served `getWebAuth()`; under the E2E harness that meant two instances
 * coexisting, working only because they share `BETTER_AUTH_SECRET` + `DATABASE_URL`. Routing reads
 * through `getWebAuth()` removes that coincidence. Every `apps/web` session read MUST use this, not
 * `getSession` directly.
 */
export async function getWebSession(headers: Headers): Promise<SessionUser | null> {
  return getSession(headers, await getWebAuth());
}
