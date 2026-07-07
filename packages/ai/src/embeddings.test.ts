import { describe, expect, it } from "vitest";
import {
  EMBEDDING_DIMS,
  EMBEDDING_MODEL,
  createFakeEmbedder,
  profileToContent,
} from "./embeddings";

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
