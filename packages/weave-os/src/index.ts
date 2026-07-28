// @resonance/weave-os — Weave's authored behaviour, as a versioned corpus behind one
// resolver seam (ADR-0020). The package depends on @resonance/core and nothing else.

import { COMPILED_CORPUS } from "./corpus.generated";
import { validateCorpus, type CorpusDiagnostic } from "./diagnostics";
import { createWeaveOsResolver } from "./resolve";

/**
 * Resolve the corpus for one conversation.
 *
 * `resolveWeaveOs({ flow, context }) -> { system, flow, outputs, releaseId }` — parse,
 * validate, resolve inheritance, route, activate, compose and stamp, behind four return
 * values. See `resolve.ts` for what each one is and why they are not one string.
 */
export const resolveWeaveOs = createWeaveOsResolver(COMPILED_CORPUS);

/**
 * Every cross-file problem in the shipped corpus.
 *
 * A separate surface from the resolver on purpose. The corpus ships with unresolved
 * references — the interview flow applies seven principles that the principles file does
 * not define — and only the designer can say what they mean. Naming them loudly is the
 * honest state; guessing at them would be the drift this whole scheme exists to prevent.
 * `resolveWeaveOs` therefore still works, and this is where the outstanding questions
 * live. `packages/weave-os/DEFECTS.md` is the human-facing version of the same list.
 */
export function weaveOsDiagnostics(): readonly CorpusDiagnostic[] {
  return validateCorpus(COMPILED_CORPUS);
}

export type { ResolveWeaveOsInput, ResolvedWeaveOs, WeaveOsContext } from "./resolve";
export { WeaveOsContextSchema } from "./resolve";

export {
  CORPUS_DIAGNOSTIC_CODES,
  CORPUS_DIAGNOSTIC_SEVERITIES,
  corpusErrors,
  formatDiagnostics,
  type CorpusDiagnostic,
  type CorpusDiagnosticCode,
  type CorpusDiagnosticSeverity,
} from "./diagnostics";

// The Pattern Registry rulebook. Its *records* are Postgres rows reached through
// @resonance/db (ADR-0020 § 4); what is exported here is the governed config that says
// where a promoted pattern goes and what has to be true first.
export {
  PatternRegistryRulebookSchema,
  type PatternRegistryRulebook,
  type PromotionDestination,
  type PromotionTarget,
  type PromotionGuidance,
  type PromotionReadiness,
  type LifecycleState,
  type MetricDefinition,
} from "./registry-rulebook";

/** The registry rulebook as compiled, or `null` if the corpus carries none. */
export const weaveOsRegistry = COMPILED_CORPUS.registry;
