// Fail-closed auth secret resolution.
//
// The insecure dev fallback is allowed ONLY under an explicit opt-in:
//   - NODE_ENV (normalised to lowercase; UNSET treated as "production") === "test", OR
//   - RESONANCE_FAKES === "1"  (the project's mock-first seam)
//
// In ALL other cases — production, unset NODE_ENV, "development" without
// RESONANCE_FAKES, or any unknown env — this function THROWS.
// An empty-string value for either the explicit arg or the env var is
// treated as NOT configured (matches the `.env.example` convention).

const DEV_FALLBACK = "dev-insecure-secret-change-me";

export type SecretEnv = {
  BETTER_AUTH_SECRET?: string;
  NODE_ENV?: string;
  RESONANCE_FAKES?: string;
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

  // 3. No real secret configured. Allow the insecure dev fallback ONLY under
  //    an explicit opt-in; throw everywhere else.
  const nodeEnv = (env.NODE_ENV ?? "").toLowerCase().trim();
  const isTestEnv = nodeEnv === "test";
  const isFakesEnabled = env.RESONANCE_FAKES === "1";

  if (isTestEnv || isFakesEnabled) {
    return DEV_FALLBACK;
  }

  // Unset NODE_ENV, "production", "development", "staging", or anything else
  // without RESONANCE_FAKES — all fail closed.
  throw new Error(
    "BETTER_AUTH_SECRET is not configured. " +
      "Set the BETTER_AUTH_SECRET environment variable. " +
      "The insecure dev fallback is only permitted when NODE_ENV=test or RESONANCE_FAKES=1.",
  );
}
