// Session helper — reads the Better Auth session from request headers and
// returns the canonical `SessionUser` principal (id, email, roles).
//
// Intentional deviation from the task brief: the brief's sketch returns
// `{ userId, email, roles }`. We return `SessionUser` (`{ id, email, roles }`)
// instead so the rest of the app has exactly one principal type. `id` maps to
// `session.user.id` (same field, different key name).

import type { Role } from "@resonance/core";
import { getAuth } from "./auth";
import { decodeRoles } from "./roles";

/** The authenticated principal exposed to the rest of the app. */
export interface SessionUser {
  id: string;
  email: string;
  roles: Role[];
}

/**
 * Resolve the current session from incoming request headers.
 * Returns `null` when no valid session cookie / token is present.
 *
 * Usage (RSC / Server Action / route handler):
 *   const user = await getSession(headers());
 */
export async function getSession(headers: Headers): Promise<SessionUser | null> {
  const session = await getAuth().api.getSession({ headers });
  if (!session) return null;

  const rolesRaw = (session.user as { roles?: string }).roles;
  return {
    id: session.user.id,
    email: session.user.email,
    roles: decodeRoles(rolesRaw),
  };
}
