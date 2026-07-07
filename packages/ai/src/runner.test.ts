import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AgentError } from "./errors";
import { defineAgent } from "./registry";
import { runAgentStream, runAgentStructured } from "./runner";

const usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: 0, text: 0, reasoning: undefined },
};
const stop = { unified: "stop" as const, raw: undefined };

const streamingModel = (text: string) =>
  new MockLanguageModelV3({
    doStream: async () => ({
      stream: simulateReadableStream({
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "text-start", id: "0" },
          { type: "text-delta", id: "0", delta: text },
          { type: "text-end", id: "0" },
          { type: "finish", finishReason: stop, usage },
        ],
      }),
    }),
  });

const toolCallModel = (toolName: string, input: unknown) =>
  new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: "tool-call", toolCallId: "c1", toolName, input: JSON.stringify(input) }],
      finishReason: { unified: "tool-calls" as const, raw: undefined },
      usage,
      warnings: [],
    }),
  });

const textOnlyModel = (text: string) =>
  new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: stop,
      usage,
      warnings: [],
    }),
  });

describe("runAgentStream", () => {
  it("streams the model's text through the agent", async () => {
    const agent = defineAgent({ id: "chat", model: "anthropic/x", system: "be nice" });
    const result = runAgentStream(agent, {
      messages: [{ role: "user", content: "hi" }],
      model: streamingModel("hello there"),
    });
    expect(await result.text).toBe("hello there");
  });
});

describe("runAgentStructured", () => {
  const doubler = defineAgent<{ doubled: number }>({
    id: "doubler",
    model: "anthropic/x",
    system: "double it",
    tools: [
      {
        name: "record",
        description: "record a doubled value",
        inputSchema: z.object({ v: z.number() }),
        handler: async (input) => {
          const { v } = z.object({ v: z.number() }).parse(input);
          return { doubled: v * 2 };
        },
      },
    ],
  });

  it("forces the tool call, executes it, and returns its validated output", async () => {
    const { output } = await runAgentStructured(doubler, {
      messages: [{ role: "user", content: "double 21" }],
      model: toolCallModel("record", { v: 21 }),
    });
    expect(output).toEqual({ doubled: 42 });
  });

  it("throws AgentError when the model answers without calling the required tool", async () => {
    await expect(
      runAgentStructured(doubler, {
        messages: [{ role: "user", content: "double 21" }],
        model: textOnlyModel("I won't use the tool"),
      }),
    ).rejects.toBeInstanceOf(AgentError);
  });

  it("throws AgentError preserving the cause when the tool handler throws", async () => {
    const cause = new Error("voyage embedding failed");
    const failing = defineAgent<{ ok: boolean }>({
      id: "failing",
      model: "anthropic/x",
      system: "call it",
      tools: [
        {
          name: "record",
          description: "record a value",
          inputSchema: z.object({ v: z.number() }),
          handler: async () => {
            throw cause;
          },
        },
      ],
    });

    const error = await runAgentStructured(failing, {
      messages: [{ role: "user", content: "double 21" }],
      model: toolCallModel("record", { v: 21 }),
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(AgentError);
    expect((error as AgentError).cause).toBe(cause);
  });

  it("throws AgentError when the model calls an unknown tool", async () => {
    await expect(
      runAgentStructured(doubler, {
        messages: [{ role: "user", content: "double 21" }],
        model: toolCallModel("nonexistent", { v: 21 }),
      }),
    ).rejects.toBeInstanceOf(AgentError);
  });

  it("throws AgentError for an agent with no tools", async () => {
    const noTools = defineAgent({ id: "empty", model: "anthropic/x", system: "" });
    await expect(
      runAgentStructured(noTools, {
        messages: [{ role: "user", content: "x" }],
        model: textOnlyModel("hi"),
      }),
    ).rejects.toBeInstanceOf(AgentError);
  });
});
