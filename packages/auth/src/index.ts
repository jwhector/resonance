// @resonance/auth — self-hosted identity via Better Auth (magic-link), persisted in
// our own Postgres through @resonance/db (ADR-0005).

// Principal type — the stable shape the app and domain packages consume.
export type { SessionUser } from "./session";

// Auth instance factory, lazy singleton, and type.
export { createAuth, getAuth, type Auth } from "./auth";

// Fail-closed secret resolver — exported for unit testing and advanced use.
export { resolveAuthSecret } from "./auth-secret";

// Session helper — decode session cookie into SessionUser.
export { getSession } from "./session";

// Role codec helpers.
export { encodeRoles, decodeRoles } from "./roles";

// Mail transport factory + resolver, and the auth mail seam type. `peekLoginCode` is a
// dev/test-only read-back of the fake transport's captured codes (inert without RESONANCE_FAKES).
export {
  createFakeMail,
  resolveMail,
  peekLoginCode,
  type AuthMailPort,
  type OtpType,
} from "./mail";

// emailOTP capability — send a passwordless login code (coexists with magic-link).
export { requestLoginCode } from "./otp";
