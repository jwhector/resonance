import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentError } from "./errors";
import { EMBEDDING_DIMS, EMBEDDING_MODEL, profileToContent, resolveEmbedder } from "./embeddings";
import { createFakeEmbedder } from "./testing";

const profile = {
  displayName: "Ada",
  headline: "Maker of small tools",
  bio: "I build things that fit the hand.",
  tags: ["tools", "craft"],
  offerings: [{ title: "Workshop", description: "A hands-on session" }],
};

describe("createFakeEmbedder", () => {
  const embedder = createFakeEmbedder();

  it("returns a 1024-dim vector pinned to the model dims", async () => {
    const v = await embedder.embed("hello");
    expect(v).toHaveLength(EMBEDDING_DIMS);
  });

  it("is deterministic — same text yields the same vector", async () => {
    expect(await embedder.embed("resonance")).toEqual(await embedder.embed("resonance"));
  });

  it("distinguishes different text", async () => {
    expect(await embedder.embed("a")).not.toEqual(await embedder.embed("b"));
  });

  it("embedProfile returns the model, embedded content, and a 1024-dim vector", async () => {
    const { model, content, embedding } = await embedder.embedProfile(profile);
    expect(model).toBe(EMBEDDING_MODEL);
    expect(content).toContain("Ada");
    expect(embedding).toHaveLength(EMBEDDING_DIMS);
  });
});

describe("profileToContent", () => {
  it("folds every profile field into the embedded text", () => {
    const content = profileToContent(profile);
    expect(content).toContain("Ada");
    expect(content).toContain("Maker of small tools");
    expect(content).toContain("tools, craft");
    expect(content).toContain("Workshop: A hands-on session");
  });
});

describe("resolveEmbedder (live by default, ADR-0018)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("selects a Voyage embedder when the Gateway key is present (no network at resolve time)", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "gw-key");
    vi.stubEnv("VOYAGE_API_KEY", "");
    expect(resolveEmbedder().model).toBe(EMBEDDING_MODEL);
  });

  it("falls back to direct Voyage when only VOYAGE_API_KEY is present", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("VOYAGE_API_KEY", "voyage-key");
    expect(resolveEmbedder().model).toBe(EMBEDDING_MODEL);
  });

  it("fails closed with an actionable error when no embedding provider key is present", () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "");
    vi.stubEnv("VOYAGE_API_KEY", "");
    expect(() => resolveEmbedder()).toThrow(AgentError);
    expect(() => resolveEmbedder()).toThrow(/AI_GATEWAY_API_KEY.*VOYAGE_API_KEY/s);
  });
});
