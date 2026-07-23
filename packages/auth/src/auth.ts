// @resonance/auth — Better Auth instance factory.
// `createAuth` is injectable (accepts db + mail) for testability (ADR-0013).
// `getAuth` is the lazy app singleton — deferred so importing this module
// does NOT require DATABASE_URL at module-evaluation time.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP, magicLink } from "better-auth/plugins";
import { createDb, type Db } from "@resonance/db";
import { resolveMail, type AuthMailPort } from "./mail";
import { resolveAuthSecret } from "./auth-secret";

/** Length of the emailOTP login code shown on the onboarding verification screen. */
const OTP_LENGTH = 6;

export function createAuth(opts: {
  db: Db;
  mail: AuthMailPort;
  secret?: string;
  baseURL?: string;
}) {
  const resolvedSecret = resolveAuthSecret(opts.secret);
  return betterAuth({
    secret: resolvedSecret,
    baseURL: opts.baseURL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    database: drizzleAdapter(opts.db, { provider: "pg" }),
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url, token }) => {
          await opts.mail.sendMagicLink({ email, url, token });
        },
      }),
      // Passwordless 6-digit code — coexists with magic-link on the onboarding
      // email-verification screen. The code is emailed through the SAME mail seam
      // magic-link uses (a separate message, not merged into the link email), so
      // tests assert on the fake and dev logs it. Better Auth stores/expires the
      // code in the shared `verification` table (no new migration).
      emailOTP({
        otpLength: OTP_LENGTH,
        sendVerificationOTP: async ({ email, otp, type }) => {
          await opts.mail.sendLoginCode({ email, otp, type });
        },
      }),
    ],
    user: {
      additionalFields: {
        roles: {
          type: "string",
          required: false,
          defaultValue: "member",
          input: false,
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

// App singleton — constructed lazily so the module can be imported without
// DATABASE_URL present (e.g. during `next build` or test-harness setup).
let _auth: Auth | undefined;
export function getAuth(): Auth {
  if (!_auth) _auth = createAuth({ db: createDb(), mail: resolveMail() });
  return _auth;
}
