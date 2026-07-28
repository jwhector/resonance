import { z } from "zod";
import {
  CorpusIdSchema,
  ValidationError,
  type CorpusFile,
  type CorpusId,
  type FlowOutput,
  type InterviewFlowFile,
  type OsReleaseId,
} from "@resonance/core";
import type { CompiledCorpus } from "./corpus-types";
import { composeSystemPrompt } from "./compose";
import { resolutionOrder } from "./inheritance";
import { computeReleaseId } from "./release";

/**
 * The seam: one function over the whole corpus.
 *
 * ## The interface
 *
 * `resolveWeaveOs({ flow, context }) -> { system, flow, outputs, releaseId }`
 *
 * Behind it: parse, validate, resolve inheritance, route, activate, compose, stamp. A
 * caller learns four return values and buys all seven steps (ADR-0017).
 *
 * ## Why four return values and not one string
 *
 * The corpus holds three kinds of content, consumed at different times by different
 * callers, so collapsing them into a composed prompt would be a shallow interface over a
 * deep problem (ADR-0020 § 2):
 *
 * - `system` — the philosophy, principles, rules, heuristics and stage copy that instruct
 *   the conversation.
 * - `flow` — the machinery: flow map, session state, captures, actions. Typed and
 *   validated, and deliberately **not executed**. The gap between what the corpus
 *   specifies and what the runtime does is the artefact a future evaluator scores; it is
 *   tracked, not hidden.
 * - `outputs` — what a generated artefact must satisfy. Validates a generation; it is not
 *   prompt copy.
 * - `releaseId` — which corpus produced this conversation. Pinned once at the start and
 *   stamped onto every observation, so evidence stays attributable.
 *
 * ## What it does not do
 *
 * It does not consult the cross-file validator and does not throw on a diagnostic. The
 * shipped corpus has unresolved references the designer has to settle (see
 * `diagnostics.ts`), and refusing to run until then would trade a visible, named problem
 * for an unusable package. Call `weaveOsDiagnostics()` for that surface.
 */

/**
 * What a caller knows about the conversation being started, beyond which flow it runs.
 *
 * Deliberately tiny. Everything a conversation *does* is the runtime's business; the
 * resolver only needs what changes which corpus content applies.
 */
export const WeaveOsContextSchema = z.object({
  /**
   * Specialised root modules to route in alongside the flow's own inheritance. Empty
   * today — no specialised module is authored — but validated, so a typo fails loudly the
   * first time one exists.
   */
  modules: z.array(CorpusIdSchema).default([]),
  /**
   * How much depth the conversation runs at, when the flow offers a choice. Recorded into
   * the returned session state; nothing here acts on it.
   */
  depthMode: z.string().min(1).optional(),
});
export type WeaveOsContext = z.infer<typeof WeaveOsContextSchema>;

export const ResolveWeaveOsInputSchema = z.object({
  flow: CorpusIdSchema,
  context: WeaveOsContextSchema.default({}),
});
export type ResolveWeaveOsInput = z.input<typeof ResolveWeaveOsInputSchema>;

export type ResolvedWeaveOs = {
  /** The composed prompt: guidance and copy from every routed, active record. */
  readonly system: string;
  /** The flow's machinery, typed and validated. Not executed by this package. */
  readonly flow: InterviewFlowFile;
  /** Every generation constraint the flow declares, keyed by output id. */
  readonly outputs: ReadonlyMap<CorpusId, FlowOutput>;
  /** Which compiled corpus produced this. Opaque; pass it through unchanged. */
  readonly releaseId: OsReleaseId;
};

/** Build the resolver bound to one compiled corpus. Tests bind their own. */
export function createWeaveOsResolver(
  corpus: CompiledCorpus,
): (input: ResolveWeaveOsInput) => ResolvedWeaveOs {
  const byId = new Map<CorpusId, CorpusFile>(
    corpus.files.map((entry) => [entry.file.id, entry.file]),
  );
  // The release is a property of the corpus, not of a call, so it is computed once.
  const releaseId = computeReleaseId(corpus);

  return (rawInput) => {
    const input = ResolveWeaveOsInputSchema.parse(rawInput);

    const routed = byId.get(input.flow);
    if (routed === undefined) {
      throw new ValidationError(`No corpus file defines the flow "${input.flow}".`);
    }
    if (routed.type !== "interview_flow") {
      throw new ValidationError(
        `Corpus file "${input.flow}" is a ${routed.type}, not a conversation flow.`,
      );
    }
    for (const moduleId of input.context.modules) {
      const module = byId.get(moduleId);
      if (module === undefined) {
        throw new ValidationError(`No corpus file defines the root module "${moduleId}".`);
      }
      if (module.type === "interview_flow") {
        throw new ValidationError(`Corpus file "${moduleId}" is a flow, not a root module.`);
      }
    }

    // Route: the flow's own inheritance chain, then any explicitly requested modules.
    const ordered = dedupeById([
      ...resolutionOrder(routed.id, byId),
      ...input.context.modules.flatMap((moduleId) => resolutionOrder(moduleId, byId)),
    ]);

    const flow = applyDepthMode(routed, input.context.depthMode);
    return {
      system: composeSystemPrompt(ordered, flow),
      flow,
      outputs: collectOutputs(flow),
      releaseId,
    };
  };
}

/**
 * Record the requested depth into the flow's declared starting state.
 *
 * Setting the initial value the flow itself declares is not executing the flow; the depth
 * is carried so a caller and an observation agree about which conversation was run.
 */
function applyDepthMode(flow: InterviewFlowFile, depthMode: string | undefined): InterviewFlowFile {
  if (depthMode === undefined || depthMode === flow.sessionState.depthMode) return flow;
  return { ...flow, sessionState: { ...flow.sessionState, depthMode } };
}

/**
 * Every output the flow declares, across all stages.
 *
 * Keyed by id because a caller validating one generated artefact knows its id and nothing
 * about which stage produced it. Duplicate ids are reported by the cross-file validator,
 * so the first wins here rather than silently shadowing.
 */
function collectOutputs(flow: InterviewFlowFile): ReadonlyMap<CorpusId, FlowOutput> {
  const outputs = new Map<CorpusId, FlowOutput>();
  for (const stage of flow.stages) {
    for (const output of stage.outputs) {
      if (!outputs.has(output.id)) outputs.set(output.id, output);
    }
  }
  return outputs;
}

function dedupeById(files: readonly CorpusFile[]): readonly CorpusFile[] {
  const seen = new Set<CorpusId>();
  return files.filter((file) => (seen.has(file.id) ? false : (seen.add(file.id), true)));
}
