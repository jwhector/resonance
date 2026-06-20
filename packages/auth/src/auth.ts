// @resonance/auth — Better Auth instance factory.
// `createAuth` is injectable (accepts db + mail) for testability (ADR-0013).
// `getAuth` is the lazy app singleton — deferred so importing this module
// does NOT require DATABASE_URL at module-evaluation time.

import { betterAuth } from "better-auth";
import type { Auth as BetterAuthInstance } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import type { MailPort } from "@resonance/core";
import { createDb, type Db } from "@resonance/db";
import { resolveMail } from "./mail";

// `BetterAuthInstance<any>` is intentional: TS2742 fires on the fully-inferred
// options generic because it leaks Zod v4 internals through non-portable pnpm
// paths. Erasing the options type here is safe — callers only need the stable
// `Auth` alias (which is `BetterAuthInstance<any>` too) and `api.getSession`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAuth(opts: {
  db: Db;
  mail: MailPort;
  secret?: string;
  baseURL?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): BetterAuthInstance<any> {
  return betterAuth({
    secret: opts.secret ?? process.env.BETTER_AUTH_SECRET ?? "dev-insecure-secret-change-me",
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
