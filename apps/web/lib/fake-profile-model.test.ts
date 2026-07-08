import { CreatorProfileDraftSchema, type InterviewMessage } from "@resonance/core";
import { profileGenAgent, runAgentStructured } from "@resonance/ai";
import { describe, expect, it } from "vitest";
import { createFakeProposeModel } from "./fake-profile-model";

/**
 * Proves the RESONANCE_FAKES determinism seam the `generateDraft` action relies on: the canned
 * model must drive the REAL `profileGenAgent` through the REAL `runAgentStructured` (forced tool
 * call) to a schema-valid draft — nothing here is mocked. The E2E flow with no credentials
 * depends on exactly this path.
 */
describe("createFakeProposeModel", () => {
  it("drives profileGenAgent to a valid CreatorProfileDraft via the real runner", async () => {
    const messages: InterviewMessage[] = [{ role: "user", content: "I hand-throw ceramic mugs" }];

    const { output } = await runAgentStructured(profileGenAgent, {
      messages,
      model: createFakeProposeModel(messages),
    });

    expect(() => CreatorProfileDraftSchema.parse(output)).not.toThrow();
    expect(output.nameOptions.length).toBeGreaterThanOrEqual(1);
    expect(output.bio).toContain("ceramic mugs");
  });

  it("falls back to a default bio when there is no user turn", async () => {
    const messages: InterviewMessage[] = [{ role: "assistant", content: "hello" }];
    const { output } = await runAgentStructured(profileGenAgent, {
      messages,
      model: createFakeProposeModel(messages),
    });
    expect(CreatorProfileDraftSchema.parse(output).bio.length).toBeGreaterThan(0);
  });
});
