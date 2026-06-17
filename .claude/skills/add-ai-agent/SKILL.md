---
name: add-ai-agent
description: Use when adding a new AI capability to Resonance (a generator, assistant, classifier, or conversational feature). Registers it as a typed agent in @resonance/ai's agent+tool registry so it shares the streaming runner, tool pattern, and model routing instead of being hand-rolled (ADR-0009).
---

# Recipe: Add an AI agent

Every AI feature is a **typed agent** in `@resonance/ai`. They share one runner, so a
new agent is a definition + prompt + (optional) tools — not new orchestration code.

## Steps

1. **Define the agent** under `packages/ai/src/agents/<id>/`:
   - `prompt.ts` — the system prompt (a string/template; not inlined in logic).
   - `<id>.agent.ts` — the agent definition object: `id` (kebab-case, e.g.
     `profile-gen`), `model` (pick the cheapest tier that does the job — Haiku for
     classification, Sonnet for chat, Opus for heavy generation), the system prompt,
     declared `tools`, and an `outputSchema` (Zod) if it returns structured data.
   - Export it from `packages/ai/src/index.ts` and register it in the agent registry.

2. **Tools** (if the model needs to act): define each tool with a **Zod input schema**
   and a typed handler. The model produces the input — never trust its shape; the Zod
   schema is the boundary (conventions: Validation). Tools that touch the DB call
   through `@resonance/db`; tools that touch a domain call that package's public API.

3. **Model access:** call through the AI Gateway with a `"provider/model"` string
   (ADR-0009). Don't import a provider SDK directly. Don't add a durable workflow —
   if you think you need one, check ADR-0009's "When to revisit" triggers first.

4. **Run it** via the shared runner (streaming for chat/long output). The app consumes
   the agent from a Server Action or route handler — orchestration stays server-side.

5. **Test** (ADR-0011): unit-test tool handlers and output parsing with Vitest; if the
   agent drives UI, add a component/E2E test for the surface that uses it.

6. **Diagram:** a genuinely new external dependency (e.g. a new model provider or
   service the agent calls) is a diagram change (ADR-0015). A new agent inside the
   existing `@resonance/ai` box is not.

## Reference

The `creator-interview` and `profile-gen` agents (the reference slice, ADR-0013) are
the canonical examples — copy their structure.
