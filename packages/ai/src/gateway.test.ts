import { MockLanguageModelV3 } from "ai/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentError } from "./errors";
import { resolveModel } from "./gateway";

/**
 * The model seam is live by default (ADR-0018) — no `RESONANCE_FAKES` branch. These tests pin the
 * provider-selection precedence and, crucially, the fail-closed behavior with no key. They stub
 * env per-case so they're deterministic regardless of the developer's ambient credentials, and
 * assert against the returned model shape (no network is made at resolve time).
 */
describe("resolveModel (live by default, ADR-0018)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the injected model (DI seam) and ignores env — tests never touch a live path", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const injected = new MockLanguageModelV3({});
    expect(resolveModel("anthropic/claude-opus-4-8", { model: injected })).toBe(injected);
  });

  it("routes the provider/model string through the Gateway when AI_GATEWAY_API_KEY is set", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "gw-key");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(resolveModel("anthropic/claude-opus-4-8")).toBe("anthropic/claude-opus-4-8");
  });

  it("falls back to the direct Anthropic provider (prefix stripped) when only ANTHROPIC_API_KEY is set", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    const model = resolveModel("anthropic/claude-opus-4-8");
    // A concrete LanguageModelV3, not the Gateway passthrough string.
    expect(typeof model).not.toBe("string");
    expect((model as { modelId: string }).modelId).toBe("claude-opus-4-8");
  });

  it("fails closed on a non-anthropic model when only the direct Anthropic key is set", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    expect(() => resolveModel("openai/gpt-4o")).toThrow(AgentError);
    expect(() => resolveModel("openai/gpt-4o")).toThrow(/AI_GATEWAY_API_KEY/);
  });

  it("fails closed with an actionable error when no provider key is present", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(() => resolveModel("anthropic/claude-opus-4-8")).toThrow(AgentError);
    expect(() => resolveModel("anthropic/claude-opus-4-8")).toThrow(
      /AI_GATEWAY_API_KEY.*ANTHROPIC_API_KEY/s,
    );
  });
});
