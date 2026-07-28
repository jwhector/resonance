import type { CorpusFile, CorpusValue, InterviewFlowFile } from "@resonance/core";

/**
 * Composition: the routed, activated corpus rendered as the system prompt Weave runs on.
 *
 * ## What composes and what does not
 *
 * Three kinds of content sit in the corpus, and only two of them belong in a prompt
 * (ADR-0020 § 2). Guidance and copy compose here. Machinery — the flow map, session
 * state, captures, actions — is returned typed and untouched, because consuming it would
 * be rebuilding the interview rather than founding it. Output constraints are returned
 * separately, because they validate a generation rather than instruct a conversation.
 *
 * ## Why records are rendered rather than summarised
 *
 * Every line here comes from an authored record, in the order the corpus states it. The
 * composer chooses layout, never wording: a paraphrase would make the prompt diverge from
 * the file that governs it, and the whole point of the corpus is that what Weave says is
 * reviewable as a diff. Records whose `state` is `inactive` never reach this function.
 */

/** Blocks that describe the corpus rather than instructing Weave. */
const NON_GUIDANCE_BLOCKS = new Set([
  // The parent-side inheritance list: a derived view of the child-side edges, not
  // guidance (ADR-0020 § 5).
  "architecture",
]);

/** Render the routed files, parents first, as one prompt. */
export function composeSystemPrompt(
  ordered: readonly CorpusFile[],
  flow: InterviewFlowFile,
): string {
  const sections: string[] = [];
  for (const file of ordered) {
    if (file.id === flow.id) continue;
    sections.push(...composeFile(file));
  }
  sections.push(...composeFlow(flow));
  return sections.filter((section) => section.trim().length > 0).join("\n\n");
}

function composeFile(file: CorpusFile): readonly string[] {
  switch (file.type) {
    case "interaction_philosophy": {
      const sections = [
        heading("Weave — Interaction Philosophy"),
        ...Object.entries(file.blocks)
          .filter(([name]) => !NON_GUIDANCE_BLOCKS.has(name))
          .map(([name, value]) => `${humanize(name)}:\n${renderValue(value, "  ")}`),
      ];
      const limitations = file.limitations.filter((l) => l.state === "active");
      if (limitations.length > 0) {
        sections.push(
          `Weave will never:\n${limitations.map((l) => `  - ${l.statement}`).join("\n")}`,
        );
      }
      return sections;
    }

    case "interaction_principles": {
      const principles = file.principles.filter((p) => p.state === "active");
      if (principles.length === 0) return [];
      return [
        heading("Weave — Interaction Principles"),
        "Every interaction preserves these qualities.",
        ...principles.map((principle) =>
          [
            `${principle.name}: ${principle.purpose}`,
            `  Prioritize: ${principle.prioritize.join(", ")}`,
            `  Avoid: ${principle.avoid.join(", ")}`,
          ].join("\n"),
        ),
      ];
    }

    case "behavior_rules": {
      const rules = file.rules.filter((r) => r.state === "active");
      if (rules.length === 0) return [];
      return [
        heading("Weave — Behaviour Rules"),
        ...rules.map((rule) => `${rule.directive === "do" ? "Do" : "Avoid"}: ${rule.statement}`),
      ];
    }

    case "conversation_heuristics": {
      const heuristics = file.heuristics.filter((h) => h.state === "active");
      if (heuristics.length === 0) return [];
      return [
        heading("Weave — Conversation Heuristics"),
        "Possibilities to consider, never conclusions to state.",
        ...heuristics.map((heuristic) =>
          [
            heuristic.interpretation,
            `  Signals: ${heuristic.signals.join("; ")}`,
            `  Worth considering: ${heuristic.responseDirections.join("; ")}`,
            ...(heuristic.limitations.length > 0
              ? [`  Does not hold when: ${heuristic.limitations.join("; ")}`]
              : []),
          ].join("\n"),
        ),
      ];
    }

    // A flow reached through inheritance is not a parent of anything; it is composed by
    // `composeFlow` with its stages, not here.
    case "interview_flow":
      return [];
  }
}

function composeFlow(flow: InterviewFlowFile): readonly string[] {
  const sections = [heading(`Conversation — ${humanize(flow.id)}`), flow.purpose.trim()];

  if (flow.framing.length > 0) {
    sections.push(`How to frame this conversation:\n${bullets(flow.framing)}`);
  }

  const byId = new Map(flow.stages.map((stage) => [stage.id, stage]));
  const stages = flow.flowMap.sequence
    .map((id) => byId.get(id))
    .filter((stage): stage is NonNullable<typeof stage> => stage !== undefined);

  sections.push("Stages, in order:");
  for (const stage of stages) {
    const lines = [
      `${stage.order + 1}. ${humanize(stage.id)}${stage.optional ? " (optional)" : ""} — ${stage.purpose.trim()}`,
    ];
    for (const [role, text] of Object.entries(stage.weave)) {
      lines.push(`   ${humanize(role)}: ${indentContinuation(text.trim())}`);
    }
    if (stage.guardrails.length > 0) lines.push(`   Guardrails: ${stage.guardrails.join("; ")}`);
    if (stage.avoidLanguage.length > 0) {
      lines.push(`   Never say: ${stage.avoidLanguage.join("; ")}`);
    }
    sections.push(lines.join("\n"));
  }

  return sections;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function heading(text: string): string {
  return `## ${text}`;
}

function bullets(items: readonly string[]): string {
  return items.map((item) => `  - ${item}`).join("\n");
}

/** `core_beliefs` → `Core beliefs`. Layout only; never touches authored prose. */
function humanize(id: string): string {
  const words = id.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function indentContinuation(text: string): string {
  return text.split("\n").join("\n   ");
}

/**
 * Render an authored value as readable text.
 *
 * The corpus carries blocks whose shape only the author knows, so the renderer walks
 * whatever it is given rather than expecting a schema. Deterministic in, deterministic
 * out — the release id is a hash of the same data, so wobbly rendering would look like a
 * behaviour change.
 */
function renderValue(value: CorpusValue, indent: string): string {
  if (value === null) return "";
  if (typeof value === "string") return `${indent}${value.trim().split("\n").join(`\n${indent}`)}`;
  if (typeof value === "number" || typeof value === "boolean") return `${indent}${String(value)}`;
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "object" && item !== null
          ? `${indent}-\n${renderValue(item, `${indent}  `)}`
          : `${indent}- ${scalar(item)}`,
      )
      .join("\n");
  }
  return Object.entries(value)
    .map(([name, nested]) =>
      typeof nested === "object" && nested !== null
        ? `${indent}${humanize(name)}:\n${renderValue(nested, `${indent}  `)}`
        : `${indent}${humanize(name)}: ${scalar(nested)}`,
    )
    .join("\n");
}

function scalar(value: CorpusValue): string {
  return value === null ? "" : String(value);
}
