// @resonance/ai — AI Gateway client + typed agent/tool registry + embeddings (ADR-0009).
// The home of everything AI: Weave interview, ProfileGen, CoverGen, search, matching.
//
// SKELETON: the shared streaming runner, the AI Gateway client, the embeddings helper,
// and the concrete agents (creator-interview, profile-gen) land in the reference slice
// (ADR-0013). The registry SHAPE is defined now so the pattern is established.

export { type ModelId, type AgentTool, type AgentDefinition, defineAgent } from "./registry";
