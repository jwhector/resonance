// @resonance/ai — AI Gateway client + typed agent/tool registry + the shared runner +
// embeddings + the concrete agents (ADR-0009, ADR-0010). Everything AI lives behind this
// seam; orchestration stays server-side (Server Actions / route handlers).

// Registry shape — every AI feature is an AgentDefinition run through the shared runner.
export { type ModelId, type AgentTool, type AgentDefinition, defineAgent } from "./registry";

// Typed failure surfaced by the runner.
export { AgentError } from "./errors";

// The model seam — live by default (Gateway or direct Anthropic), injected model in tests.
// Fakes live in @resonance/ai/testing, never on this shipped entrypoint (ADR-0018).
export { resolveModel } from "./gateway";

// Fail-fast boot-time config gate — assert the model AND embedding providers are jointly
// resolvable from env before onboarding starts, so a partial config (e.g. ANTHROPIC without
// VOYAGE) fails up front instead of at the profile-commit step (ADR-0018). Env-presence only.
export { assertAiConfigured } from "./provider-config";

// The shared runner — streaming + structured (tool-driven) paths.
export { runAgentStream, runAgentStructured, type RunInput } from "./runner";

// Embeddings seam (Voyage → pgvector via @resonance/db). Live by default (Gateway or direct
// Voyage); the fake embedder lives in @resonance/ai/testing for DI (ADR-0018).
export {
  type Embedder,
  type EmbeddableProfile,
  resolveEmbedder,
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
// ProfileGen: generation returns an editable draft (writes nothing); commitCreatorProfile is the
// explicit "put on profile" step the web layer calls after the user edits + picks a name. The
// generated/committed shapes are the shared @resonance/core contract (CreatorProfileDraft /
// CommitProfileInput) — import those from @resonance/core, not here.
export { profileGenAgent, PROFILE_GEN_MODEL } from "./agents/profile-gen/profile-gen.agent";
export {
  commitCreatorProfile,
  type CommitProfileContext,
  type CommitProfileResult,
} from "./agents/profile-gen/commit-profile";
