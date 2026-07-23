// Session helper — reads the Better Auth session from request headers and
// returns the canonical `SessionUser` principal (id, email, roles).
//
// Intentional deviation from the task brief: the brief's sketch returns
// `{ userId, email, roles }`. We return `SessionUser` (`{ id, email, roles }`)
// instead so the rest of the app has exactly one principal type. `id` maps to
// `session.user.id` (same field, different key name).

import type { Role } from "@resonance/core";
import { type Auth, getAuth } from "./auth";
import { decodeRoles } from "./roles";

/** The authenticated principal exposed to the rest of the app. */
export interface SessionUser {
  id: string;
  email: string;
  roles: Role[];
}

/**
 * Resolve the current session from incoming request headers, reading it through `auth` — the
 * Better Auth instance to consult (defaults to the app singleton {@link getAuth}). Returns `null`
 * when no valid session cookie / token is present.
 *
 * Pass an explicit instance so session reads run through the SAME instance that serves the auth
 * mount — one Better Auth instance per process, not two that merely agree because they share
 * `BETTER_AUTH_SECRET` + `DATABASE_URL` (seed resonance-eb15). In `apps/web` that unification lives
 * in the shell as `getWebSession` (ADR-0018 §4 keeps harness selection out of this package); this
 * function stays generic over any instance.
 *
 * Usage (RSC / Server Action / route handler):
 *   const user = await getSession(headers());              // app singleton
 *   const user = await getSession(headers(), someAuth);    // a specific instance
 */
export async function getSession(
  headers: Headers,
  auth: Auth = getAuth(),
): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;

  const rolesRaw = (session.user as { roles?: string }).roles;
  return {
    id: session.user.id,
    email: session.user.email,
    roles: decodeRoles(rolesRaw),
  };
}
