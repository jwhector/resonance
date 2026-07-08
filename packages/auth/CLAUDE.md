# @resonance/auth

Self-hosted identity: **Better Auth** with the magic-link **and** emailOTP plugins,
persisting sessions and users in our Neon Postgres via `@resonance/db` (ADR-0005). No
external identity vendor; all auth logic is in-repo.

## Status: REAL

The Better Auth instance (magic-link + emailOTP), role codec, mail seam, and session
helper are in place and tested (Increment 1 of the Creator Interview → ProfileGen
reference slice, ADR-0013).

**Not yet built (Increment 3):**

- Sign-in / onboarding UI + routes — the auth instance (magic-link **and** emailOTP) is
  ready, but there are no pages or route handlers wired yet.
- Live Resend transport — currently behind `AuthMailPort`/`resolveMail()` (see below).
  Live email delivery lands in Increment 3 alongside the sign-in UX.

## What's here

```
src/
├── auth.ts       createAuth({ db, mail }) factory + getAuth() lazy singleton
│                 (magic-link + emailOTP plugins)
├── session.ts    getSession(headers) → SessionUser | null  (RSC/Server Actions)
├── roles.ts      encodeRoles / decodeRoles (Role[] ↔ comma-encoded text column)
├── otp.ts        requestLoginCode(email) — thin server seam over the emailOTP send verb
├── mail.ts       createFakeMail() + resolveMail() (AuthMailPort seam: link + code)
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

// Mail helpers — for tests and the dev fake transport, plus the mail seam type.
export { createFakeMail, resolveMail, type AuthMailPort, type OtpType };

// emailOTP — send a passwordless 6-digit login code (coexists with magic-link).
export { requestLoginCode }; // (email: string) => Promise<void>
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

### `AuthMailPort` seam (`resolveMail()`)

Auth emails go through `AuthMailPort` — a **local superset** of the core `MailPort`.
Magic-link dispatches through `sendMagicLink({ email, url, token })`; the emailOTP
capability dispatches the 6-digit code through `sendLoginCode({ email, otp, type })`.
Both go through the **same transport instance** — one fake captures both. The OTP
method lives here (not in `@resonance/core`) because it is an auth-only concern; core
ports are earned by 2+ packages. The active transport is selected at runtime:

| `RESONANCE_FAKES` | Transport                                                                     |
| ----------------- | ----------------------------------------------------------------------------- |
| `"1"`             | `createFakeMail()` — captures links + codes in memory; logs to console in dev |
| unset / `"0"`     | `stubAuthMail` — both send paths reject (fail-closed; live Resend in Inc. 3)  |

`createFakeMail()` returns `{ port: AuthMailPort; sent: Array<{ email, url, token }>; codes: Array<{ email, otp, type }> }` — `sent` and `codes` are the test capture hooks; assert against them to verify links / codes were dispatched.

Live Resend transport is **not wired yet** — it lands in Increment 3 alongside the
sign-in UX. Until then `RESONANCE_FAKES="1"` is the only way to actually receive
a magic link or code in development.

### emailOTP alongside magic-link

The onboarding email-verification screen offers **both** "click the magic link" and
"enter the 6-digit code". These are **two independent Better Auth plugins** sending
**two independent emails through the one `AuthMailPort`** — the OTP is _not_ merged into
the magic-link email (the per-message seam has no cross-plugin composition). Better Auth
stores/expires the code in the shared `verification` table, so **no new migration** is
needed. `requestLoginCode(email)` is the thin server seam (Zod-validates `email`) that a
Server Action calls to dispatch a code without reaching into Better Auth internals; the
plugin also auto-mounts `/email-otp/send-verification-otp` and `/sign-in/email-otp` for
the browser client. Sign-in via code uses `type: "sign-in"` and auto-creates the user
with default `roles = "member"`, exactly like magic-link verify.

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
- `zod` is a **direct** dependency of this package (not just transitively via `@resonance/core`) because TypeScript requires it to name better-auth's inferred types in declaration emit — removing it reintroduces TS2742.

## Working here (seeds + mulch)

Work in this package is tracked by a `auth`-labelled seed — `sd ready` / `sd search auth` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`auth`** mulch domain: `ml record auth --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
