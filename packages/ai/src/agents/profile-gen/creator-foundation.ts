import type { LanguageModel } from "ai";
import {
  type CreatorProfileDraft,
  type FoundationGenerationRequest,
  FoundationGenerationRequestSchema,
  type FoundationGenerationResult,
  FoundationGenerationResultSchema,
  ValidationError,
} from "@resonance/core";
import { STAGE_QUESTIONS } from "../../creator-onboarding/snapshot-v1.copy";
import { AgentError } from "../../errors";
import { type AgentDefinition, defineAgent } from "../../registry";
import { runAgentStructured } from "../../runner";
import { PROFILE_GEN_MODEL, proposeProfileTool } from "./profile-gen.agent";
import { CREATOR_FOUNDATION_SYSTEM } from "./prompt";

/**
 * Generation for the staged creator interview: structured answers in, a validated profile
 * foundation out.
 *
 * It is ProfileGen fed differently. The model tier and the `proposeProfile` tool are shared, so
 * both generators produce the same draft shape through the same runner; only the prompt and the
 * input differ — named answers rather than a transcript, because the staged interview never
 * keeps one (ADR-0022).
 */
export const creatorFoundationAgent: AgentDefinition<CreatorProfileDraft> =
  defineAgent<CreatorProfileDraft>({
    id: "creator-foundation",
    model: PROFILE_GEN_MODEL,
    system: CREATOR_FOUNDATION_SYSTEM,
    tools: [proposeProfileTool],
  });

/** Turns a generation request into a foundation. The shape the web layer injects in tests. */
export type FoundationGenerator = (
  request: FoundationGenerationRequest,
) => Promise<FoundationGenerationResult>;

export type GenerateCreatorFoundationDeps = {
  /** Test seam: a fake model. Omitted in shipped code, which resolves the live provider. */
  model?: LanguageModel;
};

/** The answers as a data document the model drafts from, each paired with its question. */
function toAnswerDocument(request: FoundationGenerationRequest): string {
  const answers = request.answers.map(({ stage, answer }) => ({
    stage,
    question: STAGE_QUESTIONS[stage] ?? null,
    answer,
  }));
  return JSON.stringify({ answers }, null, 2);
}

/**
 * Generate a creator's first profile foundation from their structured interview answers.
 *
 * Live by default: the model resolves through the Gateway or direct provider, and a test injects
 * one through `deps.model` (ADR-0018). Throws `ValidationError` when the request itself is
 * malformed and `AgentError` when the model fails or returns anything that does not parse as a
 * {@link FoundationGenerationResult} — a partial draft is never accepted. Nothing here logs, and
 * neither error message carries an answer or the prompt.
 */
export async function generateCreatorFoundation(
  request: FoundationGenerationRequest,
  deps: GenerateCreatorFoundationDeps = {},
): Promise<FoundationGenerationResult> {
  const parsedRequest = FoundationGenerationRequestSchema.safeParse(request);
  if (!parsedRequest.success) {
    throw new ValidationError("Foundation generation request is malformed.", {
      cause: parsedRequest.error,
    });
  }

  const { output } = await runAgentStructured(creatorFoundationAgent, {
    messages: [{ role: "user", content: toAnswerDocument(parsedRequest.data) }],
    model: deps.model,
  });

  const parsed = FoundationGenerationResultSchema.safeParse({ draft: output });
  if (!parsed.success) {
    throw new AgentError(`Agent "${creatorFoundationAgent.id}" returned an invalid foundation`, {
      cause: parsed.error,
    });
  }
  return parsed.data;
}
