import { MockLanguageModelV3 } from "ai/test";
import {
  FoundationGenerationResultSchema,
  ValidationError,
  type FoundationGenerationRequest,
} from "@resonance/core";
import { describe, expect, it } from "vitest";
import { AgentError } from "../../errors";
import {
  FAKE_CREATOR_FOUNDATION_DRAFT,
  createFailingFoundationGenerator,
  createFakeFoundationGenerator,
  createFakeFoundationModel,
} from "../../testing";
import { generateCreatorFoundation } from "./creator-foundation";

const REQUEST: FoundationGenerationRequest = {
  behaviorVersion: "snapshot-v1",
  answers: [
    { stage: "offering", answer: { kind: "text", text: "Herbal blends and dream sessions" } },
    { stage: "intended_experience", answer: { kind: "text", text: "Calmer and more reflective" } },
    { stage: "expression_style", answer: { kind: "choice", choiceId: "dreamy_reflective" } },
  ],
};

const usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
};

describe("generateCreatorFoundation", () => {
  it("returns a validated foundation from the model's draft", async () => {
    const result = await generateCreatorFoundation(REQUEST, { model: createFakeFoundationModel() });
    expect(FoundationGenerationResultSchema.parse(result)).toEqual(result);
    expect(result.draft).toEqual(FAKE_CREATOR_FOUNDATION_DRAFT);
  });

  it("hands the model structured answers paired with their questions, not a transcript", async () => {
    const model = createFakeFoundationModel();
    await generateCreatorFoundation(REQUEST, { model });

    const prompt = model.doGenerateCalls[0]?.prompt ?? [];
    const users = prompt.filter((message) => message.role === "user");
    expect(users).toHaveLength(1);
    const part = users[0]?.content[0];
    const document = JSON.parse(part?.type === "text" ? part.text : "{}") as {
      answers: { stage: string; question: string; answer: unknown }[];
    };
    expect(document.answers.map((a) => a.stage)).toEqual([
      "offering",
      "intended_experience",
      "expression_style",
    ]);
    expect(document.answers[0]).toEqual({
      stage: "offering",
      question: "What do you want to offer or share?",
      answer: { kind: "text", text: "Herbal blends and dream sessions" },
    });
  });

  it("fails with a typed error when the model's draft does not fit the contract", async () => {
    const malformed = { nameOptions: [], headline: "", bio: "Only a bio", tags: "not-a-list" };
    await expect(
      generateCreatorFoundation(REQUEST, { model: createFakeFoundationModel(malformed) }),
    ).rejects.toBeInstanceOf(AgentError);
  });

  it("fails with a typed error when the model's output is not even JSON", async () => {
    await expect(
      generateCreatorFoundation(REQUEST, { model: createFakeFoundationModel("{not json") }),
    ).rejects.toBeInstanceOf(AgentError);
  });

  it("fails with a typed error when the model never calls its tool", async () => {
    const chatty = new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [{ type: "text", text: "Here is your profile!" }],
        finishReason: { unified: "stop" as const, raw: undefined },
        usage,
        warnings: [],
      }),
    });
    await expect(generateCreatorFoundation(REQUEST, { model: chatty })).rejects.toBeInstanceOf(
      AgentError,
    );
  });

  it("keeps the creator's answers out of the error it throws", async () => {
    const error = await generateCreatorFoundation(REQUEST, {
      model: createFakeFoundationModel({ headline: "" }),
    }).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(AgentError);
    expect((error as Error).message).not.toContain("Herbal blends");
  });

  it("refuses a malformed request before any model is called", async () => {
    const model = createFakeFoundationModel();
    await expect(
      generateCreatorFoundation({ behaviorVersion: "snapshot-v1", answers: [] }, { model }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(model.doGenerateCalls).toHaveLength(0);
  });
});

describe("the test foundation generators", () => {
  it("resolves the fixed draft whatever the answers", async () => {
    await expect(createFakeFoundationGenerator()(REQUEST)).resolves.toEqual({
      draft: FAKE_CREATOR_FOUNDATION_DRAFT,
    });
  });

  it("fails the way the live generator does", async () => {
    await expect(createFailingFoundationGenerator()(REQUEST)).rejects.toBeInstanceOf(AgentError);
  });
});
