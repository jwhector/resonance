import { type Auth, createAuth, getAuth } from "@resonance/auth";
import { createDb } from "@resonance/db";
import { E2E_HARNESS, harnessMail } from "./e2e-harness";

/**
 * The auth instance the web shell serves from `app/api/auth/[...all]/route.ts`.
 *
 * By default this is the live `getAuth()` singleton (`@resonance/auth`), whose mail resolves to
 * the live Resend transport (`resolveMail`, ADR-0018). Under the E2E harness — and never in
 * production (see {@link E2E_HARNESS}) — it is instead an isolated instance built via the
 * `createAuth({ db, mail })` DI seam with the in-memory {@link harnessMail} fake, so the
 * passwordless flow captures OTPs the `/api/test/last-otp` read-back can observe.
 *
 * The harness instance is a lazy singleton (like `getAuth`) so importing this module never
 * requires `DATABASE_URL` at build time; the secret is resolved by `@resonance/auth` exactly as
 * the live path does (the E2E boots with a fixed `BETTER_AUTH_SECRET` from `playwright.config.ts`).
 */
let _harnessAuth: Auth | undefined;
function harnessAuth(): Auth {
  if (!_harnessAuth) _harnessAuth = createAuth({ db: createDb(), mail: harnessMail() });
  return _harnessAuth;
}

export function getWebAuth(): Auth {
  return E2E_HARNESS ? harnessAuth() : getAuth();
}
