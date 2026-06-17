# @resonance/auth

Self-hosted identity: **Better Auth** with the magic-link plugin, persisting sessions
and users in our Neon Postgres via `@resonance/db` (ADR-0005). No external identity
vendor; all auth logic is in-repo.

## Status: SKELETON

The Better Auth instance + magic-link flow + session helpers land in the reference
slice (Creator onboarding sign-up, ADR-0013). Magic-link email is sent via Resend.

Exposes `SessionUser` (the authenticated principal) as the stable type the app and
domain packages consume.

## Rules (when building it out)

- Depends on `@resonance/core` and `@resonance/db`. Auth tables live in the same DB.
- Keep the public surface small: a server-side `auth` instance + helpers like
  `getSession()`. Don't leak Better Auth internals across the boundary.
- Secrets (`BETTER_AUTH_SECRET`) via env, validated at startup.
