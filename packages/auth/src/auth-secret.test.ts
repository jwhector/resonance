// packages/auth/src/auth-secret.test.ts
// Full matrix for the fail-closed auth secret helper.
// Uses the injectable `env` bag — no process.env mutation needed.

import { describe, expect, it } from "vitest";
import { resolveAuthSecret } from "./auth-secret";

const FALLBACK = "dev-insecure-secret-change-me";

describe("resolveAuthSecret", () => {
  // ── Real secret configured ──────────────────────────────────────────────

  it("returns explicit secret even in production", () => {
    expect(resolveAuthSecret("my-real-secret", { NODE_ENV: "production" })).toBe("my-real-secret");
  });

  it("returns BETTER_AUTH_SECRET env var when no explicit secret", () => {
    expect(
      resolveAuthSecret(undefined, {
        BETTER_AUTH_SECRET: "env-secret",
        NODE_ENV: "production",
      }),
    ).toBe("env-secret");
  });

  it("explicit secret takes precedence over env var", () => {
    expect(
      resolveAuthSecret("explicit", {
        BETTER_AUTH_SECRET: "env-secret",
        NODE_ENV: "production",
      }),
    ).toBe("explicit");
  });

  // ── Empty string treated as unset ───────────────────────────────────────

  it("throws when BETTER_AUTH_SECRET is empty string and not in opt-in env", () => {
    expect(() =>
      resolveAuthSecret(undefined, {
        BETTER_AUTH_SECRET: "",
        NODE_ENV: "production",
      }),
    ).toThrow("BETTER_AUTH_SECRET is not configured");
  });

  it("throws when explicit is empty string and not in opt-in env", () => {
    expect(() => resolveAuthSecret("", { NODE_ENV: "production" })).toThrow(
      "BETTER_AUTH_SECRET is not configured",
    );
  });

  // ── Opt-in: NODE_ENV=test ───────────────────────────────────────────────

  it("returns dev fallback when NODE_ENV=test", () => {
    expect(resolveAuthSecret(undefined, { NODE_ENV: "test" })).toBe(FALLBACK);
  });

  // ── Opt-in: RESONANCE_FAKES=1 ──────────────────────────────────────────

  it("returns dev fallback when RESONANCE_FAKES=1 and NODE_ENV is unset", () => {
    expect(resolveAuthSecret(undefined, { RESONANCE_FAKES: "1" })).toBe(FALLBACK);
  });

  it("returns dev fallback when RESONANCE_FAKES=1 and NODE_ENV=development", () => {
    expect(
      resolveAuthSecret(undefined, {
        RESONANCE_FAKES: "1",
        NODE_ENV: "development",
      }),
    ).toBe(FALLBACK);
  });

  // ── Fail-closed cases ───────────────────────────────────────────────────

  it("throws when NODE_ENV=production and no secret configured", () => {
    expect(() => resolveAuthSecret(undefined, { NODE_ENV: "production" })).toThrow(
      "BETTER_AUTH_SECRET is not configured",
    );
  });

  it("throws when NODE_ENV is UNSET (treated as production)", () => {
    expect(() => resolveAuthSecret(undefined, {})).toThrow("BETTER_AUTH_SECRET is not configured");
  });

  it("throws when NODE_ENV=undefined (treated as production)", () => {
    expect(() => resolveAuthSecret(undefined, { NODE_ENV: undefined })).toThrow(
      "BETTER_AUTH_SECRET is not configured",
    );
  });

  it("throws when NODE_ENV=development without RESONANCE_FAKES", () => {
    expect(() => resolveAuthSecret(undefined, { NODE_ENV: "development" })).toThrow(
      "BETTER_AUTH_SECRET is not configured",
    );
  });

  it("throws when NODE_ENV=staging and no secret configured", () => {
    expect(() => resolveAuthSecret(undefined, { NODE_ENV: "staging" })).toThrow(
      "BETTER_AUTH_SECRET is not configured",
    );
  });

  it("throws when NODE_ENV=PRODUCTION (case normalization)", () => {
    expect(() => resolveAuthSecret(undefined, { NODE_ENV: "PRODUCTION" })).toThrow(
      "BETTER_AUTH_SECRET is not configured",
    );
  });

  it("throws when NODE_ENV=Production (mixed case normalization)", () => {
    expect(() => resolveAuthSecret(undefined, { NODE_ENV: "Production" })).toThrow(
      "BETTER_AUTH_SECRET is not configured",
    );
  });

  it("does NOT allow fallback when RESONANCE_FAKES=0", () => {
    expect(() =>
      resolveAuthSecret(undefined, {
        NODE_ENV: "development",
        RESONANCE_FAKES: "0",
      }),
    ).toThrow("BETTER_AUTH_SECRET is not configured");
  });
});
