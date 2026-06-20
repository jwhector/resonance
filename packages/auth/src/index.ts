// @resonance/auth — self-hosted identity via Better Auth (magic-link), persisted in
// our own Postgres through @resonance/db (ADR-0005).

// Principal type — the stable shape the app and domain packages consume.
export type { SessionUser } from "./session";

// Auth instance factory, lazy singleton, and type.
export { createAuth, getAuth, type Auth } from "./auth";

// Session helper — decode session cookie into SessionUser.
export { getSession } from "./session";

// Role codec helpers.
export { encodeRoles, decodeRoles } from "./roles";

// Mail transport factory + resolver.
export { createFakeMail, resolveMail } from "./mail";
