# @resonance/auth

Self-hosted identity: **Better Auth** with the magic-link **and** emailOTP plugins,
persisting sessions and users in our Neon Postgres via `@resonance/db` (ADR-0005). No
external identity vendor; all auth logic is in-repo.

## Status: REAL

The Better Auth instance (magic-link + emailOTP), role codec, **live-by-default** mail seam
(live Resend; test-injected fake), and session helper are in place and tested. The sign-in /
onboarding UI + routes are wired in `apps/web` (Increment 3, ADR-0013).

**Remaining to fully go live:** a verified Resend sending domain. `createResendMail`
defaults `from` to Resend's shared `onboarding@resend.dev`, which delivers only to the
Resend account owner's own address until you verify a domain and set `RESEND_FROM_EMAIL`.

## What's here

```
src/
├── auth.ts       createAuth({ db, mail }) factory + getAuth() lazy singleton
│                 (magic-link + emailOTP plugins)
├── session.ts    getSession(headers) → SessionUser | null  (RSC/Server Actions)
├── roles.ts      encodeRoles / decodeRoles (Role[] ↔ comma-encoded text column)
├── otp.ts        requestLoginCode(email) — thin server seam over the emailOTP send verb
├── mail.ts       createResendMail() + resolveMail() (live-by-default) + peekLoginCode (AuthMailPort)
├── testing/fake-mail.ts  createFakeMail() — test-only double, exported at @resonance/auth/testing
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

// Mail helpers — the live Resend transport, the live-by-default resolver, and the seam type.
// `peekLoginCode` is a dev/test-only OTP read-back (inert in production).
export { createResendMail, resolveMail, peekLoginCode, type AuthMailPort, type OtpType };

// emailOTP — send a passwordless 6-digit login code (coexists with magic-link).
export { requestLoginCode }; // (email: string) => Promise<void>
```

```ts
// Test-only subpath (ADR-0018) — the in-memory fake double, injected via DI in tests.
import { createFakeMail } from "@resonance/auth/testing";
// createAuth({ db, mail: createFakeMail().port })
```

## Key design decisions

### `createAuth({ db, mail })` injection seam

The factory accepts `Db` and `MailPort` explicitly so integration tests can inject
`TestDb` (PGlite in-memory) and `createFakeMail()` (from `@resonance/auth/testing`) without
touching real services. `getAuth()` is the app singleton — it calls `createAuth` lazily (not
at module import time) so `DATABASE_URL` is not required at build time.

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
ports are earned by 2+ packages. `resolveMail()` is **live-by-default** (ADR-0018) — there is
**no `RESONANCE_FAKES` branch in runtime code**. It selects the transport by key presence:

| Condition            | Transport                                                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY` set | `createResendMail()` — **live** Resend send (branded HTML)                                      |
| else                 | `stubAuthMail` — both send paths reject (**fail-closed**; degrades explicitly, no silent no-op) |

Fakes are never selected here. Tests inject `createFakeMail()` (from `@resonance/auth/testing`)
via `createAuth({ mail })`; a credential-gated live-smoke exercises the real Resend send before
release (ADR-0018). `createResendMail({ apiKey, from })` builds the live transport; errors from
Resend are thrown, not swallowed.

**`peekLoginCode(email)`** is a dev/test-only OTP read-back on the main entrypoint. It reads a
process-wide observation buffer that the test-only `createFakeMail()` registers on construction,
so a DI-injected fake's captured codes are observable across Next.js route-handler module scopes.
It is **inert in production** (nothing constructs a fake there, so nothing registers). Removing
the `RESONANCE_FAKES` selector makes the current deterministic OTP E2E inert until it is
re-pointed — final disposition of `peekLoginCode` + the `/api/test/last-otp` route is tracked by
seed **resonance-a4a4** (a separate, human-gated decision).

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
  The insecure dev fallback is gated on `NODE_ENV=test` only (no `RESONANCE_FAKES` selector);
  production fails closed (ADR-0018).
- All tests use `createAuth({ db: testDb, mail: createFakeMail().port })` — with
  `createFakeMail` imported from `@resonance/auth/testing` — so they never touch Neon or Resend.
- `zod` is a **direct** dependency of this package (not just transitively via `@resonance/core`) because TypeScript requires it to name better-auth's inferred types in declaration emit — removing it reintroduces TS2742.

## Working here (seeds + mulch)

Work in this package is tracked by a `auth`-labelled seed — `sd ready` / `sd search auth` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`auth`** mulch domain: `ml record auth --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
