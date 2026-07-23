import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentError } from "./errors";
import { assertAiConfigured } from "./provider-config";

/**
 * `assertAiConfigured` is the fail-fast boot-time gate (ADR-0018): it asserts the model AND
 * embedding providers are JOINTLY resolvable from env, mirroring the joint gate in
 * `scripts/verify-live.mjs`. These cases pin the exact partial-config behavior the seed
 * (resonance-2fdc) exists to fix — ANTHROPIC-without-VOYAGE must fail HERE, not later at the
 * profile-commit `resolveEmbedder` call. Env is stubbed per-case so it's deterministic and
 * credential-free (no live provider is touched).
 */
describe("assertAiConfigured (fail-fast joint gate, ADR-0018)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("passes with only the Gateway key — it covers both model and embedding", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "gw-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("VOYAGE_API_KEY", "");
    expect(() => assertAiConfigured()).not.toThrow();
  });

  it("passes with both direct keys present (Anthropic model + Voyage embedding)", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubEnv("VOYAGE_API_KEY", "voyage-key");
    expect(() => assertAiConfigured()).not.toThrow();
  });

  it("fails fast on a partial config — Anthropic set, Voyage missing — naming VOYAGE_API_KEY", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubEnv("VOYAGE_API_KEY", "");
    expect(() => assertAiConfigured()).toThrow(AgentError);
    expect(() => assertAiConfigured()).toThrow(/VOYAGE_API_KEY/);
    // The model provider IS configured, so it must not be reported as missing.
    expect(() => assertAiConfigured()).not.toThrow(/ANTHROPIC_API_KEY missing/);
  });

  it("fails fast when only Voyage is set — naming the missing model provider (ANTHROPIC_API_KEY)", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("VOYAGE_API_KEY", "voyage-key");
    expect(() => assertAiConfigured()).toThrow(AgentError);
    expect(() => assertAiConfigured()).toThrow(/ANTHROPIC_API_KEY/);
  });

  it("fails fast with nothing configured — naming both direct keys and the Gateway key", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("VOYAGE_API_KEY", "");
    expect(() => assertAiConfigured()).toThrow(AgentError);
    expect(() => assertAiConfigured()).toThrow(/ANTHROPIC_API_KEY.*VOYAGE_API_KEY/s);
    expect(() => assertAiConfigured()).toThrow(/AI_GATEWAY_API_KEY/);
  });
});
