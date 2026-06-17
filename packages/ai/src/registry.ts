import { type z } from "zod";

/**
 * The typed agent + tool registry (ADR-0009). Every AI feature in Resonance is an
 * `AgentDefinition` run through one shared runner — never a hand-rolled streaming/tool
 * loop. This file defines the SHAPE; the runner and concrete agents (creator-interview,
 * profile-gen) land in the reference slice (ADR-0013). See .claude/skills/add-ai-agent.
 */

/** A model identifier as a Gateway "provider/model" string, e.g. "anthropic/claude-sonnet-4-6". */
export type ModelId = `${string}/${string}`;

/** A tool the model may call. Input is produced by the model — always Zod-validated. */
export interface AgentTool<Input = unknown, Output = unknown> {
  name: string;
  description: string;
  inputSchema: z.ZodType<Input>;
  /** Runs server-side; touches the DB/domains via their packages, never directly. */
  handler: (input: Input) => Promise<Output>;
}

/** A typed AI capability. */
export interface AgentDefinition<Output = unknown> {
  /** kebab-case id, e.g. "profile-gen". */
  id: string;
  /** Default model (cheapest tier that does the job). */
  model: ModelId;
  /** System prompt (kept in a sibling prompt file, not inlined in logic). */
  system: string;
  /** Tools the model may call (optional). */
  tools?: AgentTool[];
  /** Output schema when the agent returns structured data (optional). */
  outputSchema?: z.ZodType<Output>;
}

/** Helper for defining an agent with inferred types. */
export function defineAgent<Output>(def: AgentDefinition<Output>): AgentDefinition<Output> {
  return def;
}
