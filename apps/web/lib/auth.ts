import { type Auth, createAuth, getAuth } from "@resonance/auth";
import { createDb } from "@resonance/db";
import { harnessMailOverride } from "./e2e-harness";

/**
 * The auth instance the web shell serves from `app/api/auth/[...all]/route.ts`.
 *
 * Live `getAuth()` by default (mail → live Resend, ADR-0018). Under the E2E harness — and never in
 * production (see `e2e-harness.ts`) — it is instead an isolated instance built via the
 * `createAuth({ db, mail })` DI seam with the in-memory harness fake, so the passwordless flow
 * captures OTPs the `/api/test/last-otp` read-back can observe.
 *
 * Async because the harness fake mail is dynamically imported (kept out of the shipped bundle);
 * the harness instance is a lazy singleton (built at most once) and importing this module never
 * requires `DATABASE_URL` at build time. The secret is resolved by `@resonance/auth` exactly as
 * the live path does (the E2E boots with a fixed `BETTER_AUTH_SECRET` from `playwright.config.ts`).
 */
let _harnessAuth: Auth | undefined;

export async function getWebAuth(): Promise<Auth> {
  const mail = await harnessMailOverride();
  if (!mail) return getAuth();
  if (!_harnessAuth) _harnessAuth = createAuth({ db: createDb(), mail });
  return _harnessAuth;
}
