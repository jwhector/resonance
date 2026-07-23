import { type CreatorProfileDraft, CreatorProfileDraftSchema } from "@resonance/core";
import { type AgentDefinition, defineAgent } from "../../registry";
import { PROFILE_GEN_SYSTEM } from "./prompt";

/** Opus — the heavy-generation tier (ADR-0009 model routing). Swappable via the Gateway. */
export const PROFILE_GEN_MODEL = "anthropic/claude-opus-4-8";

/**
 * The ProfileGen agent. Its single `proposeProfile` tool turns the interview transcript into an
 * editable `CreatorProfileDraft` and RETURNS it — generation writes nothing. The draft (up to
 * three candidate names plus headline, bio, tags) is handed to the person to review and edit;
 * persistence happens later, on an explicit commit, in `commitCreatorProfile`.
 *
 * No server context (userId / roles / db / embedder) is needed anymore — generation is pure — so
 * this is a plain exported agent like `creator-interview`, not a context-injection factory.
 */
export const profileGenAgent: AgentDefinition<CreatorProfileDraft> =
  defineAgent<CreatorProfileDraft>({
    id: "profile-gen",
    model: PROFILE_GEN_MODEL,
    system: PROFILE_GEN_SYSTEM,
    tools: [
      {
        name: "proposeProfile",
        description:
          "Return the finished profile draft. Call this exactly once with the draft you have written — the person will review, edit, pick a name, and publish it themselves.",
        inputSchema: CreatorProfileDraftSchema,
        handler: async (raw): Promise<CreatorProfileDraft> => {
          // Pure: no DB, no embedder, no role flip — generation persists nothing. The AI SDK
          // already validated `raw` against inputSchema; re-parse to recover the narrowed type
          // at this boundary (the registry handler receives `unknown`) and hand the draft back.
          return CreatorProfileDraftSchema.parse(raw);
        },
      },
    ],
  });
