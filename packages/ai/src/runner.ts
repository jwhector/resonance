import {
  type LanguageModel,
  type ModelMessage,
  type StreamTextResult,
  type ToolSet,
  generateText,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import type { InterviewMessage } from "@resonance/core";
import { AgentError } from "./errors";
import { resolveModel } from "./gateway";
import type { AgentDefinition, AgentTool } from "./registry";

/**
 * The one shared runner (ADR-0009): every AI feature runs through here, never a hand-rolled
 * streaming/tool loop. Two entry points over the same registry shape — a streaming path for
 * the interview chat and a structured path for tool-driven generation (ProfileGen).
 */

export interface RunInput {
  /** The conversation so far, in the shared `@resonance/core` chat contract. */
  messages: InterviewMessage[];
  /** Test/E2E seam: inject a model instead of resolving one from the agent's id. */
  model?: LanguageModel;
}

/** Narrow the shared chat contract into the AI SDK's message union (no cast needed). */
function toModelMessages(messages: InterviewMessage[]): ModelMessage[] {
  return messages.map((m) =>
    m.role === "user"
      ? { role: "user", content: m.content }
      : { role: "assistant", content: m.content },
  );
}

/** Adapt the registry's typed tools to the AI SDK tool set (it validates input via inputSchema). */
function toToolSet(tools: AgentTool[] | undefined): ToolSet | undefined {
  if (!tools?.length) return undefined;
  return Object.fromEntries(
    tools.map((t) => [
      t.name,
      tool({
        description: t.description,
        inputSchema: t.inputSchema,
        execute: (input) => t.handler(input),
      }),
    ]),
  );
}

/**
 * Streaming path — wraps `streamText` with the agent's system prompt and the transcript.
 * Returns the AI SDK stream result; the caller (a route handler) turns it into an HTTP
 * stream. Model errors surface on the stream, not synchronously.
 */
export function runAgentStream(
  agent: AgentDefinition,
  input: RunInput,
): StreamTextResult<ToolSet, never> {
  return streamText({
    model: resolveModel(agent.model, { model: input.model }),
    system: agent.system,
    messages: toModelMessages(input.messages),
    tools: toToolSet(agent.tools),
  });
}

/**
 * Structured path — the agent must call exactly one tool, which does the real work (e.g.
 * `saveProfile` persisting + embedding). Forces the tool call, executes it, and returns its
 * validated output. Throws a typed `AgentError` on any failure — never swallows (design spec
 * § Error handling).
 */
export async function runAgentStructured<Output>(
  agent: AgentDefinition<Output>,
  input: RunInput,
): Promise<{ output: Output; text: string }> {
  const tools = toToolSet(agent.tools);
  if (!tools) {
    throw new AgentError(`Agent "${agent.id}" has no tools to run in the structured path`);
  }

  let result;
  try {
    result = await generateText({
      model: resolveModel(agent.model, { model: input.model }),
      system: agent.system,
      messages: toModelMessages(input.messages),
      tools,
      toolChoice: "required",
      // One step: force the tool call, execute it, stop — no extra closing model turn.
      stopWhen: stepCountIs(1),
    });
  } catch (err) {
    throw new AgentError(`Agent "${agent.id}" failed to generate`, { cause: err });
  }

  const toolError = result.content.find((part) => part.type === "tool-error");
  if (toolError) {
    throw new AgentError(`Agent "${agent.id}" tool failed`, { cause: toolError.error });
  }

  const toolResult = result.toolResults.at(-1);
  if (!toolResult) {
    throw new AgentError(`Agent "${agent.id}" did not call its required tool`);
  }
  // The tool's handler is the source of truth for the agent's Output (registry contract).
  return { output: toolResult.output as Output, text: result.text };
}
