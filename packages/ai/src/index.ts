// @resonance/ai — AI Gateway client + typed agent/tool registry + the shared runner +
// embeddings + the concrete agents (ADR-0009, ADR-0010). Everything AI lives behind this
// seam; orchestration stays server-side (Server Actions / route handlers).

// Registry shape — every AI feature is an AgentDefinition run through the shared runner.
export { type ModelId, type AgentTool, type AgentDefinition, defineAgent } from "./registry";

// Typed failure surfaced by the runner.
export { AgentError } from "./errors";

// The model seam — live Gateway / fake / injected model.
export { resolveModel } from "./gateway";

// The shared runner — streaming + structured (tool-driven) paths.
export { runAgentStream, runAgentStructured, type RunInput } from "./runner";

// Embeddings seam (Voyage → pgvector via @resonance/db).
export {
  type Embedder,
  type EmbeddableProfile,
  resolveEmbedder,
  createLiveEmbedder,
  createFakeEmbedder,
  profileToContent,
  EMBEDDING_MODEL,
  EMBEDDING_DIMS,
} from "./embeddings";

// Concrete agents.
export {
  creatorInterviewAgent,
  CREATOR_INTERVIEW_MODEL,
} from "./agents/creator-interview/creator-interview.agent";
export { CREATOR_INTERVIEW_SYSTEM } from "./agents/creator-interview/prompt";
export {
  defineProfileGenAgent,
  PROFILE_GEN_MODEL,
  type ProfileGenContext,
  type SaveProfileResult,
} from "./agents/profile-gen/profile-gen.agent";
export { ProfileGenSchema, type GeneratedProfile } from "./agents/profile-gen/profile-gen.schema";
