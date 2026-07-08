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

// Live-by-default mail transport factory + resolver, and the auth mail seam type.
// `peekLoginCode` is a dev/test-only read-back of a DI-injected fake's captured OTPs — inert
// in production (nothing registers a fake there). The in-memory fake itself lives on the
// test-only `@resonance/auth/testing` subpath (ADR-0018), NOT on this runtime entrypoint.
export {
  createResendMail,
  resolveMail,
  peekLoginCode,
  type AuthMailPort,
  type OtpType,
} from "./mail";

// emailOTP capability — send a passwordless login code (coexists with magic-link).
export { requestLoginCode } from "./otp";
