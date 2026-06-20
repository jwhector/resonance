// @resonance/auth — Better Auth instance factory.
// `createAuth` is injectable (accepts db + mail) for testability (ADR-0013).
// `getAuth` is the lazy app singleton — deferred so importing this module
// does NOT require DATABASE_URL at module-evaluation time.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import type { MailPort } from "@resonance/core";
import { createDb, type Db } from "@resonance/db";
import { resolveMail } from "./mail";

export function createAuth(opts: { db: Db; mail: MailPort; secret?: string; baseURL?: string }) {
  const resolvedSecret =
    opts.secret ?? process.env.BETTER_AUTH_SECRET ?? "dev-insecure-secret-change-me";
  if (!opts.secret && !process.env.BETTER_AUTH_SECRET && process.env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET must be set in production");
  }
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
