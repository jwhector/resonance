// @resonance/auth — self-hosted identity via Better Auth (magic-link), persisted in
// our own Postgres through @resonance/db (ADR-0005).
//
// SKELETON: the Better Auth instance, magic-link plugin, and session helpers land in
// the reference slice (ADR-0013). Typed placeholder for now.

import { type Role } from "@resonance/core";

/** The authenticated principal exposed to the rest of the app. */
export interface SessionUser {
  id: string;
  email: string;
  roles: Role[];
}
