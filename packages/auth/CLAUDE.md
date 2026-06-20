# @resonance/auth

Self-hosted identity: **Better Auth** with the magic-link plugin, persisting sessions
and users in our Neon Postgres via `@resonance/db` (ADR-0005). No external identity
vendor; all auth logic is in-repo.

## Status: REAL

The Better Auth instance, role codec, mail seam, and session helper are in place and
tested (Increment 1 of the Creator Interview → ProfileGen reference slice, ADR-0013).

**Not yet built (Increment 3):**

- Sign-in UI / magic-link routes — the auth instance is ready but there are no pages
  or route handlers wired yet.
- Live Resend transport — currently behind `MailPort`/`resolveMail()` (see below).
  Live email delivery lands in Increment 3 alongside the sign-in UX.

## What's here

```
src/
├── auth.ts       createAuth({ db, mail }) factory + getAuth() lazy singleton
├── session.ts    getSession(headers) → SessionUser | null  (RSC/Server Actions)
├── roles.ts      encodeRoles / decodeRoles (Role[] ↔ comma-encoded text column)
├── mail.ts       createFakeMail() + resolveMail() (MailPort seam)
└── index.ts      public re-exports
```

## Public API

Import only from `"@resonance/auth"` — never reach into `src/` internals.

```ts
// Principal type — the stable shape the app and domain packages consume.
export type { SessionUser }; // { id, email, roles: Role[] }

// Auth instance factory and app singleton.
export { createAuth, getAuth, type Auth };

// Session helper — decodes the session cookie for RSC / Server Actions.
export { getSession }; // (headers: Headers) => Promise<SessionUser | null>

// Role codec — encode/decode Role[] to/from the single comma-encoded text column.
export { encodeRoles, decodeRoles };

// Mail helpers — for tests and the dev fake transport.
export { createFakeMail, resolveMail };
```

## Key design decisions

### `createAuth({ db, mail })` injection seam

The factory accepts `Db` and `MailPort` explicitly so integration tests can inject
`TestDb` (PGlite in-memory) and `createFakeMail()` without touching real services.
`getAuth()` is the app singleton — it calls `createAuth` lazily (not at module
import time) so `DATABASE_URL` is not required at build time.

### `roles` as a comma-encoded `text` column

Better Auth's `additionalFields` supports `"string"` type only — no array field type.
`Role[]` values are stored as a single `text` column in the `user` table:

```ts
encodeRoles(["member", "creator"]); // → "member,creator"
decodeRoles("member,creator"); // → ["member", "creator"] (Zod-validated)
```

`Role` and `RoleSchema` come from `@resonance/core` and flow through here — the
codec is the boundary where comma text is validated into typed `Role` values.

### `MailPort` seam (`resolveMail()`)

Magic-link emails go through `MailPort` (defined in `@resonance/core`). The active
transport is selected at runtime:

| `RESONANCE_FAKES` | Transport                                                                       |
| ----------------- | ------------------------------------------------------------------------------- |
| `"1"`             | `createFakeMail()` — captures sent links in memory; logs to console in dev      |
| unset / `"0"`     | `stubMail` from `@resonance/core` — no-op (live Resend deferred to Increment 3) |

Live Resend transport is **not wired yet** — it lands in Increment 3 alongside the
sign-in UX. Until then `RESONANCE_FAKES="1"` is the only way to actually receive
a magic link in development.

### `getSession(headers)`

Thin wrapper around `auth.api.getSession`. Decodes the session cookie from incoming
`Headers` (pass `headers()` from `next/headers` in RSC/Server Actions), extracts
`id`, `email`, and `roles` (via `decodeRoles`), and returns a `SessionUser`.
Returns `null` when there is no valid session.

## Rules

- Depends on `@resonance/core` and `@resonance/db`. No domain package imports
  are allowed here — auth is a platform concern.
- Keep the public surface small. Never leak Better Auth internals across the
  package boundary.
- Secrets (`BETTER_AUTH_SECRET`) come from env, validated at runtime in `createAuth`.
- All tests use `createAuth({ db: testDb, mail: createFakeMail().port })` so they
  never touch Neon or Resend.
