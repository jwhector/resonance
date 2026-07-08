import { MockLanguageModelV3 } from "ai/test";
import { type CreatorProfileDraft, CreatorProfileDraftSchema } from "@resonance/core";
import { creatorProfiles, embeddings } from "@resonance/db";
import { createTestDb } from "@resonance/db/testing";
import { describe, expect, it } from "vitest";
import { runAgentStructured } from "../../runner";
import { profileGenAgent } from "./profile-gen.agent";

const draft: CreatorProfileDraft = {
  nameOptions: [
    { name: "Ada", description: "Her own name — personal and direct." },
    { name: "Small Tools Studio", description: "A studio brand for the workshop." },
    { name: "The Handmade Bench", description: "A descriptive handle for discovery." },
  ],
  headline: "Maker of small tools",
  bio: "I build things that fit the hand, for people who make with their hands.",
  tags: ["tools", "craft"],
};

const usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
};

/** A model that always calls proposeProfile with the canned draft. */
const proposeProfileModel = (d: CreatorProfileDraft) =>
  new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [
        {
          type: "tool-call",
          toolCallId: "c1",
          toolName: "proposeProfile",
          input: JSON.stringify(d),
        },
      ],
      finishReason: { unified: "tool-calls" as const, raw: undefined },
      usage,
      warnings: [],
    }),
  });

const run = (d: CreatorProfileDraft) =>
  runAgentStructured(profileGenAgent, {
    messages: [{ role: "user", content: "Here is my interview transcript…" }],
    model: proposeProfileModel(d),
  });

describe("profile-gen generation (returns a draft, writes nothing)", () => {
  it("returns a valid CreatorProfileDraft with up to 3 name options", async () => {
    const { output } = await run(draft);

    expect(() => CreatorProfileDraftSchema.parse(output)).not.toThrow();
    expect(output).toEqual(draft);
    expect(output.nameOptions).toHaveLength(3);
    expect(output.nameOptions.length).toBeLessThanOrEqual(3);
  });

  it("accepts a single name option (the minimum)", async () => {
    const single: CreatorProfileDraft = { ...draft, nameOptions: [draft.nameOptions[0]!] };
    const { output } = await run(single);

    expect(output.nameOptions).toHaveLength(1);
    expect(output.nameOptions[0]?.name).toBe("Ada");
  });

  // Generous timeout: this drives the real (fake-model) runner; ~1s in isolation but can exceed the
  // 5s default under parallel test-suite CPU contention (seed resonance-75e5).
  it(
    "writes NOTHING — running generation persists no profile or embedding rows",
    { timeout: 20000 },
    async () => {
      // Generation takes no db/embedder handle, so it cannot write. Guard that contract: run it,
      // then confirm a fresh store is still empty (a future regression that re-added a write here
      // would surface as rows).
      const { db, close } = await createTestDb();
      try {
        await run(draft);
        expect(await db.select().from(creatorProfiles)).toHaveLength(0);
        expect(await db.select().from(embeddings)).toHaveLength(0);
      } finally {
        await close();
      }
    },
  );
});
