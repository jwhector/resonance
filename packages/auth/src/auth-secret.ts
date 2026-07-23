// Fail-closed auth secret resolution.
//
// The insecure dev fallback is allowed ONLY under an explicit opt-in:
//   - NODE_ENV (normalised to lowercase; UNSET treated as "production") === "test".
//
// In ALL other cases — production, unset NODE_ENV, "development", or any unknown env —
// this function THROWS. An empty-string value for either the explicit arg or the env var
// is treated as NOT configured (matches the `.env.example` convention).
//
// Live-by-default (ADR-0018): the fallback is a test-only convenience gated on NODE_ENV=test,
// not an env-flag fake selector. Production always requires a real BETTER_AUTH_SECRET.

const DEV_FALLBACK = "dev-insecure-secret-change-me";

export type SecretEnv = {
  BETTER_AUTH_SECRET?: string;
  NODE_ENV?: string;
};

export function resolveAuthSecret(
  explicit: string | undefined,
  env: SecretEnv = process.env as SecretEnv,
): string {
  // 1. Explicit argument wins (non-empty).
  if (explicit !== undefined && explicit !== "") {
    return explicit;
  }

  // 2. Env var wins (non-empty).
  const envSecret = env.BETTER_AUTH_SECRET;
  if (envSecret !== undefined && envSecret !== "") {
    return envSecret;
  }

  // 3. No real secret configured. Allow the insecure dev fallback ONLY under NODE_ENV=test;
  //    throw everywhere else.
  const nodeEnv = (env.NODE_ENV ?? "").toLowerCase().trim();
  if (nodeEnv === "test") {
    return DEV_FALLBACK;
  }

  // Unset NODE_ENV, "production", "development", "staging", or anything else — all fail closed.
  throw new Error(
    "BETTER_AUTH_SECRET is not configured. " +
      "Set the BETTER_AUTH_SECRET environment variable. " +
      "The insecure dev fallback is only permitted when NODE_ENV=test.",
  );
}
