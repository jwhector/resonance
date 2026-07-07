import { MockLanguageModelV3 } from "ai/test";
import { creatorProfiles, findSimilarProfiles, getCreatorProfileById, user } from "@resonance/db";
import { createTestDb, type TestDb } from "@resonance/db/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFakeEmbedder } from "../../embeddings";
import { runAgentStructured } from "../../runner";
import { defineProfileGenAgent } from "./profile-gen.agent";
import type { GeneratedProfile } from "./profile-gen.schema";

const generated: GeneratedProfile = {
  displayName: "Ada",
  headline: "Maker of small tools",
  bio: "I build things that fit the hand, for people who make with their hands.",
  tags: ["tools", "craft"],
  offerings: [{ title: "Workshop", description: "A hands-on afternoon session" }],
};

const usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
};

/** A model that always calls saveProfile with the canned generated profile. */
const saveProfileModel = (profile: GeneratedProfile) =>
  new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [
        {
          type: "tool-call",
          toolCallId: "c1",
          toolName: "saveProfile",
          input: JSON.stringify(profile),
        },
      ],
      finishReason: { unified: "tool-calls" as const, raw: undefined },
      usage,
      warnings: [],
    }),
  });

describe("profile-gen saveProfile tool (PGlite)", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await db.insert(user).values({ id: "u1", name: "Ada", email: "ada@x.com" });
  });
  afterEach(async () => {
    await close();
  });

  const run = () => {
    const agent = defineProfileGenAgent({
      userId: "u1",
      currentRoles: ["member"],
      db,
      embedder: createFakeEmbedder(),
    });
    return runAgentStructured(agent, {
      messages: [{ role: "user", content: "Here is my interview transcript…" }],
      model: saveProfileModel(generated),
    });
  };

  it("persists the profile row from the generated content", async () => {
    const { output } = await run();
    expect(output.profileId).toBeTruthy();

    const row = await getCreatorProfileById(db, output.profileId);
    expect(row?.displayName).toBe("Ada");
    expect(row?.headline).toBe("Maker of small tools");
    expect(row?.tags).toEqual(["tools", "craft"]);
    expect(row?.offerings).toEqual(generated.offerings);
    expect(row?.status).toBe("ready");
    expect(row?.userId).toBe("u1");
  });

  it("flips the user from member into a creator", async () => {
    await run();
    const rows = await db.select().from(user);
    const ada = rows.find((r) => r.id === "u1");
    expect(ada?.roles).toBe("member,creator");
  });

  it("is idempotent — a second run for the same user updates in place, no duplicate", async () => {
    const { output: first } = await run();
    const { output: second } = await run();

    expect(second.profileId).toBe(first.profileId);
    const rows = await db.select().from(creatorProfiles);
    expect(rows.filter((r) => r.userId === "u1")).toHaveLength(1);
  });

  it("embeds the profile so the matching backbone finds it (ADR-0010)", async () => {
    const { output } = await run();

    // Re-embed the same profile text and query — the deterministic fake makes it the top hit.
    const embedder = createFakeEmbedder();
    const { embedding } = await embedder.embedProfile(generated);
    const results = await findSimilarProfiles(db, embedding);

    expect(results[0]?.id).toBe(output.profileId);
    expect(results[0]?.similarity).toBeGreaterThan(0.99);
  });
});
