import {
  PRINCIPLE_DIMENSIONS,
  CORPUS_CONFIDENCE_LEVELS,
  CORPUS_FILE_LAYERS,
  type CorpusFile,
  type CorpusId,
  type InterviewFlowFile,
} from "@resonance/core";
import type { CompiledCorpus, CompiledCorpusFile } from "./corpus-types";
import { computeInheritedBy } from "./inheritance";

/**
 * The cross-file validator: everything that can only be judged with the whole corpus in
 * hand.
 *
 * ## Why this is separate from parsing
 *
 * A schema judges one file against its own shape. Most of what can be wrong with a corpus
 * is a relationship *between* files — a flow naming a principle that does not exist, a
 * promotion destination pointing at a file nobody wrote, a root file nothing inherits.
 * Those are not parse failures, and treating them as such would mean a corpus with one
 * dangling reference could not be loaded at all.
 *
 * ## Diagnostics are reported, not thrown
 *
 * The shipped corpus **has errors**, on purpose. The authored interview flow names seven
 * `appliedPrinciples` that do not exist in the principles file — two vocabularies that do
 * not meet. Resolving them to the nearest real principle would put words in the designer's
 * mouth, which is the exact failure mode the corpus's provenance rules exist to prevent.
 * So the validator names all seven, every build and every test run, and the corpus still
 * loads: the composed prompt inherits the seven real principles the flow's `inherits`
 * chain gives it, and the seven unresolved names buy nothing until the designer says what
 * they mean.
 *
 * That is why `resolveWeaveOs` does not consult diagnostics and does not throw on them.
 * Errors here mean "a human owes this corpus an answer", not "this corpus is unusable".
 */

export const CORPUS_DIAGNOSTIC_SEVERITIES = ["error", "warning"] as const;
export type CorpusDiagnosticSeverity = (typeof CORPUS_DIAGNOSTIC_SEVERITIES)[number];

/**
 * The kinds of cross-file problem the validator knows how to name.
 *
 * A closed set rather than free-form strings, so a test can assert on a code without
 * asserting on prose, and so a new check has to be a deliberate addition.
 */
export const CORPUS_DIAGNOSTIC_CODES = [
  /** A flow's `appliedPrinciples` names an id that no principle record defines. */
  "unresolved_principle_reference",
  /** A file's `inherits` names a file id that no file defines. */
  "unresolved_inheritance",
  /** Following `inherits` from a file leads back to that file. */
  "inheritance_cycle",
  /** Two files claim the same id. */
  "duplicate_file_id",
  /** Two records within one file claim the same id. */
  "duplicate_record_id",
  /** A flow's `flowMap.sequence` and its `stages` do not describe the same stages. */
  "flow_sequence_mismatch",
  /** A stage's `order` does not match its position in `flowMap.sequence`. */
  "stage_order_mismatch",
  /** `sessionState.currentStage` names a stage the flow does not define. */
  "unresolved_current_stage",
  /** `sessionState.flowId` does not match the flow's own id. */
  "session_flow_id_mismatch",
  /** An optional branch leads to a target that is not a stage. Expected; see below. */
  "unresolved_branch_target",
  /** `minimumInformation` names something that is neither a capture nor a stage. */
  "unresolved_minimum_information",
  /** A behaviour rule's `appliesPrinciples` names an id no principle defines. */
  "unresolved_applied_principle",
  /** A behaviour rule's `scope` names a flow id no flow defines. */
  "unresolved_rule_scope",
  /** A promotion destination points at a corpus path that does not exist. */
  "unresolved_promotion_destination",
  /** A promotion destination is a path template rather than a path. */
  "templated_promotion_destination",
  /** The philosophy does not carry the change guardrail its governance depends on. */
  "missing_change_guardrail",
  /** The corpus's principle ids and the evaluation rubric's have drifted apart. */
  "principle_rubric_mismatch",
  /** The registry's confidence ladder and the shared one have drifted apart. */
  "confidence_ladder_mismatch",
  /** A root file exists that no other file inherits, so it reaches no conversation. */
  "uninherited_root_file",
  /** A file's authored parent-side `inherited_by` list disagrees with the real edges. */
  "inheritance_view_divergence",
] as const;
export type CorpusDiagnosticCode = (typeof CORPUS_DIAGNOSTIC_CODES)[number];

/** One thing a human has to decide about, located precisely enough to act on. */
export type CorpusDiagnostic = {
  readonly severity: CorpusDiagnosticSeverity;
  readonly code: CorpusDiagnosticCode;
  /** The id of the file the problem was found in. */
  readonly fileId: CorpusId;
  /** Dotted path to the offending value within that file. */
  readonly at: string;
  readonly message: string;
};

/** Run every cross-file check. Order is stable so output can be diffed between runs. */
export function validateCorpus(corpus: CompiledCorpus): readonly CorpusDiagnostic[] {
  const found: CorpusDiagnostic[] = [];
  const byId = indexById(corpus.files, found);
  const principleIds = collectPrincipleIds(corpus.files);
  const flowIds = new Set(
    corpus.files.filter((f) => f.file.type === "interview_flow").map((f) => f.file.id),
  );

  checkPrincipleRubric(principleIds, corpus.files, found);
  checkChangeGuardrail(corpus.files, found);
  checkDuplicateRecordIds(corpus.files, found);
  checkInheritance(corpus.files, byId, found);
  checkUninheritedRootFiles(corpus.files, found);
  checkInheritanceViewDivergence(corpus.files, found);
  checkBehaviorRules(corpus.files, principleIds, flowIds, found);

  for (const entry of corpus.files) {
    if (entry.file.type === "interview_flow") checkFlow(entry.file, principleIds, found);
  }

  checkRegistry(corpus, found);
  return found;
}

/** The subset a build should refuse to ignore. */
export function corpusErrors(
  diagnostics: readonly CorpusDiagnostic[],
): readonly CorpusDiagnostic[] {
  return diagnostics.filter((diagnostic) => diagnostic.severity === "error");
}

/** Render diagnostics for a terminal, one per line, grouped by nothing. */
export function formatDiagnostics(diagnostics: readonly CorpusDiagnostic[]): string {
  return diagnostics
    .map(
      (d) =>
        `${d.severity === "error" ? "ERROR" : "warn "} ${d.code}  ${d.fileId}.${d.at}\n        ${d.message}`,
    )
    .join("\n");
}

// ---------------------------------------------------------------------------
// Checks
// ---------------------------------------------------------------------------

function indexById(
  files: readonly CompiledCorpusFile[],
  found: CorpusDiagnostic[],
): ReadonlyMap<CorpusId, CorpusFile> {
  const byId = new Map<CorpusId, CorpusFile>();
  for (const entry of files) {
    const existing = byId.get(entry.file.id);
    if (existing !== undefined) {
      found.push({
        severity: "error",
        code: "duplicate_file_id",
        fileId: entry.file.id,
        at: "id",
        message: `Two files claim the id "${entry.file.id}"; the second is ${entry.path}.`,
      });
      continue;
    }
    byId.set(entry.file.id, entry.file);
  }
  return byId;
}

function collectPrincipleIds(files: readonly CompiledCorpusFile[]): ReadonlySet<CorpusId> {
  const ids = new Set<CorpusId>();
  for (const entry of files) {
    if (entry.file.type !== "interaction_principles") continue;
    for (const principle of entry.file.principles) ids.add(principle.id);
  }
  return ids;
}

/**
 * The corpus's principles and `@resonance/core`'s per-principle evaluation sub-scores are
 * two lists of the same thing. Nothing structural keeps them equal, so this does.
 */
function checkPrincipleRubric(
  principleIds: ReadonlySet<CorpusId>,
  files: readonly CompiledCorpusFile[],
  found: CorpusDiagnostic[],
): void {
  const principlesFile = files.find((f) => f.file.type === "interaction_principles");
  if (principlesFile === undefined) return;

  const rubric = new Set<string>(PRINCIPLE_DIMENSIONS);
  const missingFromCorpus = [...rubric].filter((id) => !principleIds.has(id));
  const missingFromRubric = [...principleIds].filter((id) => !rubric.has(id));

  for (const id of missingFromCorpus) {
    found.push({
      severity: "error",
      code: "principle_rubric_mismatch",
      fileId: principlesFile.file.id,
      at: "principles",
      message: `The evaluation rubric scores "${id}", but no principle with that id is authored.`,
    });
  }
  for (const id of missingFromRubric) {
    found.push({
      severity: "error",
      code: "principle_rubric_mismatch",
      fileId: principlesFile.file.id,
      at: `principles.${id}`,
      message: `Principle "${id}" is authored but the evaluation rubric has no sub-score for it.`,
    });
  }
}

/**
 * ADR-0020 § 3b: the philosophy's `unacceptableReasons` is the one guardrail standing
 * between a self-modifying system and the erosion of its own foundation. A guardrail that
 * only exists in prose is not a guardrail, so its presence is checked in code.
 */
function checkChangeGuardrail(
  files: readonly CompiledCorpusFile[],
  found: CorpusDiagnostic[],
): void {
  for (const entry of files) {
    if (entry.file.type !== "interaction_philosophy") continue;
    const policy = entry.file.evolutionPolicy;
    if (policy !== undefined && policy.unacceptableReasons.length > 0) continue;
    found.push({
      severity: "error",
      code: "missing_change_guardrail",
      fileId: entry.file.id,
      at: "evolutionPolicy.unacceptableReasons",
      message:
        "The philosophy must name the reasons that do not justify changing it; without them " +
        "any proposal can be waved through on a reason the author already ruled out.",
    });
  }
}

function checkDuplicateRecordIds(
  files: readonly CompiledCorpusFile[],
  found: CorpusDiagnostic[],
): void {
  for (const entry of files) {
    for (const [at, ids] of recordIdsOf(entry.file)) {
      const seen = new Set<CorpusId>();
      for (const id of ids) {
        if (seen.has(id)) {
          found.push({
            severity: "error",
            code: "duplicate_record_id",
            fileId: entry.file.id,
            at: `${at}.${id}`,
            message: `Two records in "${at}" claim the id "${id}"; a promotion action naming it could not tell them apart.`,
          });
        }
        seen.add(id);
      }
    }
  }
}

/** Every addressable record in a file, grouped by the field that holds it. */
function recordIdsOf(file: CorpusFile): readonly (readonly [string, readonly CorpusId[]])[] {
  switch (file.type) {
    case "interaction_philosophy":
      return [["limitations", file.limitations.map((l) => l.id)]];
    case "interaction_principles":
      return [["principles", file.principles.map((p) => p.id)]];
    case "behavior_rules":
      return [["rules", file.rules.map((r) => r.id)]];
    case "conversation_heuristics":
      return [["heuristics", file.heuristics.map((h) => h.id)]];
    case "interview_flow":
      return [
        ["stages", file.stages.map((s) => s.id)],
        ["outputs", file.stages.flatMap((s) => s.outputs.map((o) => o.id))],
      ];
  }
}

function checkInheritance(
  files: readonly CompiledCorpusFile[],
  byId: ReadonlyMap<CorpusId, CorpusFile>,
  found: CorpusDiagnostic[],
): void {
  for (const entry of files) {
    for (const parentId of entry.file.inherits) {
      if (byId.has(parentId)) continue;
      found.push({
        severity: "error",
        code: "unresolved_inheritance",
        fileId: entry.file.id,
        at: `inherits.${parentId}`,
        message: `Inherits "${parentId}", which no corpus file defines.`,
      });
    }
  }

  for (const entry of files) {
    if (reachesItself(entry.file.id, byId)) {
      found.push({
        severity: "error",
        code: "inheritance_cycle",
        fileId: entry.file.id,
        at: "inherits",
        message: `Following inheritance from "${entry.file.id}" leads back to itself.`,
      });
    }
  }
}

function reachesItself(start: CorpusId, byId: ReadonlyMap<CorpusId, CorpusFile>): boolean {
  const seen = new Set<CorpusId>();
  const pending = [...(byId.get(start)?.inherits ?? [])];
  while (pending.length > 0) {
    const next = pending.pop();
    if (next === undefined) break;
    if (next === start) return true;
    if (seen.has(next)) continue;
    seen.add(next);
    pending.push(...(byId.get(next)?.inherits ?? []));
  }
  return false;
}

/**
 * A root file nothing inherits reaches no conversation, however well authored it is. The
 * two promotion-target files are in exactly that position today, which is a fact the
 * designer needs before promoting anything into them.
 */
function checkUninheritedRootFiles(
  files: readonly CompiledCorpusFile[],
  found: CorpusDiagnostic[],
): void {
  const inherited = new Set<CorpusId>(files.flatMap((entry) => [...entry.file.inherits]));
  for (const entry of files) {
    if (entry.file.type === "interview_flow") continue;
    if (inherited.has(entry.file.id)) continue;
    found.push({
      severity: "warning",
      code: "uninherited_root_file",
      fileId: entry.file.id,
      at: "id",
      message:
        `No file inherits "${entry.file.id}", so nothing it contains reaches a conversation. ` +
        "Inheritance is stored child-side, so a flow has to name it.",
    });
  }
}

/**
 * The philosophy carries the designer's own parent-side inheritance list under
 * `blocks.architecture.inherited_by`. ADR-0020 § 5 makes that a derived view with no
 * authority: the child edge wins, and a disagreement is reported rather than reconciled.
 *
 * Entries are written as paths and the layer wildcards `active/*` and `root/*`, so they
 * are normalised to file ids before comparison. This check is what turned up the corpus's
 * disputed heuristics filename.
 */
function checkInheritanceViewDivergence(
  files: readonly CompiledCorpusFile[],
  found: CorpusDiagnostic[],
): void {
  const inheritedBy = computeInheritedBy(files);
  const layerOf = new Map(
    files.map((entry) => [entry.file.id, CORPUS_FILE_LAYERS[entry.file.type]]),
  );

  for (const entry of files) {
    const authored = readAuthoredInheritedBy(entry.file);
    if (authored === undefined) continue;
    const actual = new Set(inheritedBy.get(entry.file.id) ?? []);

    for (const claim of authored) {
      const wildcardLayer = claim.endsWith("/*") ? claim.slice(0, -2) : undefined;
      const matched =
        wildcardLayer !== undefined
          ? [...actual].some((id) => layerOf.get(id) === wildcardLayer)
          : actual.has(normaliseFileReference(claim));
      if (matched) continue;
      found.push({
        severity: "warning",
        code: "inheritance_view_divergence",
        fileId: entry.file.id,
        at: `blocks.architecture.inherited_by.${claim}`,
        message: `The authored list says "${claim}" inherits this file, but no such file names it in \`inherits\`.`,
      });
    }

    for (const childId of actual) {
      const layer = layerOf.get(childId);
      const claimed = authored.some(
        (claim) =>
          normaliseFileReference(claim) === childId ||
          (claim.endsWith("/*") && claim.slice(0, -2) === layer),
      );
      if (claimed) continue;
      found.push({
        severity: "warning",
        code: "inheritance_view_divergence",
        fileId: entry.file.id,
        at: "blocks.architecture.inherited_by",
        message: `"${childId}" inherits this file but the authored list does not mention it.`,
      });
    }
  }
}

/** `root/weave_behavior_rules.yaml` -> `weave_behavior_rules`. */
function normaliseFileReference(reference: string): string {
  const withoutDirectory = reference.slice(reference.lastIndexOf("/") + 1);
  return withoutDirectory.replace(/\.ya?ml$/, "");
}

function readAuthoredInheritedBy(file: CorpusFile): readonly string[] | undefined {
  if (file.type !== "interaction_philosophy") return undefined;
  const architecture = file.blocks["architecture"];
  if (typeof architecture !== "object" || architecture === null || Array.isArray(architecture)) {
    return undefined;
  }
  const claims = architecture["inherited_by"];
  if (!Array.isArray(claims)) return undefined;
  return claims.filter((claim): claim is string => typeof claim === "string");
}

function checkBehaviorRules(
  files: readonly CompiledCorpusFile[],
  principleIds: ReadonlySet<CorpusId>,
  flowIds: ReadonlySet<CorpusId>,
  found: CorpusDiagnostic[],
): void {
  for (const entry of files) {
    if (entry.file.type !== "behavior_rules") continue;
    for (const rule of entry.file.rules) {
      for (const principleId of rule.appliesPrinciples) {
        if (principleIds.has(principleId)) continue;
        found.push({
          severity: "error",
          code: "unresolved_applied_principle",
          fileId: entry.file.id,
          at: `rules.${rule.id}.appliesPrinciples.${principleId}`,
          message: `Rule "${rule.id}" translates principle "${principleId}", which is not authored.`,
        });
      }
      for (const flowId of rule.scope) {
        if (flowIds.has(flowId)) continue;
        found.push({
          severity: "error",
          code: "unresolved_rule_scope",
          fileId: entry.file.id,
          at: `rules.${rule.id}.scope.${flowId}`,
          message: `Rule "${rule.id}" is scoped to flow "${flowId}", which is not authored.`,
        });
      }
    }
  }
}

function checkFlow(
  flow: InterviewFlowFile,
  principleIds: ReadonlySet<CorpusId>,
  found: CorpusDiagnostic[],
): void {
  // THE check. Every unresolved id is named individually, because a count tells the
  // designer nothing and a summary invites someone to "fix" it by picking near matches.
  for (const principleId of flow.appliedPrinciples) {
    if (principleIds.has(principleId)) continue;
    found.push({
      severity: "error",
      code: "unresolved_principle_reference",
      fileId: flow.id,
      at: `appliedPrinciples.${principleId}`,
      message:
        `Flow "${flow.id}" applies principle "${principleId}", which no principle record ` +
        "defines. The flow and the principles file use two different vocabularies; only " +
        "the author of both can say how they correspond.",
    });
  }

  const stageIds = new Set(flow.stages.map((stage) => stage.id));
  const sequence = flow.flowMap.sequence;

  for (const stageId of sequence) {
    if (stageIds.has(stageId)) continue;
    found.push({
      severity: "error",
      code: "flow_sequence_mismatch",
      fileId: flow.id,
      at: `flowMap.sequence.${stageId}`,
      message: `The flow runs stage "${stageId}", which it does not define.`,
    });
  }
  for (const stage of flow.stages) {
    if (sequence.includes(stage.id)) continue;
    found.push({
      severity: "error",
      code: "flow_sequence_mismatch",
      fileId: flow.id,
      at: `stages.${stage.id}`,
      message: `Stage "${stage.id}" is defined but never runs: it is absent from the sequence.`,
    });
  }
  for (const stage of flow.stages) {
    const position = sequence.indexOf(stage.id);
    if (position < 0 || position === stage.order) continue;
    found.push({
      severity: "error",
      code: "stage_order_mismatch",
      fileId: flow.id,
      at: `stages.${stage.id}.order`,
      message: `Stage "${stage.id}" declares order ${stage.order} but sits at position ${position} in the sequence.`,
    });
  }

  if (!stageIds.has(flow.sessionState.currentStage)) {
    found.push({
      severity: "error",
      code: "unresolved_current_stage",
      fileId: flow.id,
      at: "sessionState.currentStage",
      message: `A conversation starts in "${flow.sessionState.currentStage}", which is not a stage of this flow.`,
    });
  }
  if (flow.sessionState.flowId !== flow.id) {
    found.push({
      severity: "error",
      code: "session_flow_id_mismatch",
      fileId: flow.id,
      at: "sessionState.flowId",
      message: `Session state belongs to "${flow.sessionState.flowId}" but sits in flow "${flow.id}".`,
    });
  }

  // A warning, not an error: `@resonance/core` records that a branch target is a
  // flow-local response direction and need not name a stage. Resolving these against
  // stages would reject the corpus's own file — but an undefined direction is still
  // something the designer should see.
  for (const [branch, target] of Object.entries(flow.flowMap.optionalBranches)) {
    for (const leadsTo of target.leadsTo) {
      if (stageIds.has(leadsTo)) continue;
      found.push({
        severity: "warning",
        code: "unresolved_branch_target",
        fileId: flow.id,
        at: `flowMap.optionalBranches.${branch}.leadsTo.${leadsTo}`,
        message: `Branch "${branch}" leads to "${leadsTo}", which is neither a stage nor defined anywhere else in the corpus.`,
      });
    }
  }

  const captureIds = new Set(flow.stages.flatMap((stage) => stage.captures.map((c) => c.id)));
  const known = new Set([...captureIds, ...stageIds]);
  const requirements: readonly (readonly [string, readonly string[]])[] = [
    ["requiredForGeneration", flow.minimumInformation.requiredForGeneration],
    ["recommended", flow.minimumInformation.recommended],
    ["optional", flow.minimumInformation.optional],
  ];
  for (const [field, entries] of requirements) {
    for (const entry of entries) {
      if (known.has(entry)) continue;
      found.push({
        severity: "warning",
        code: "unresolved_minimum_information",
        fileId: flow.id,
        at: `minimumInformation.${field}.${entry}`,
        message: `Generation depends on "${entry}", which is neither a capture nor a stage of this flow.`,
      });
    }
  }
}

/**
 * The rulebook's promotion destinations are corpus-relative paths, so they can point at a
 * file nobody wrote. One of them is a template by design, which is a different thing and
 * gets a different code.
 */
function checkRegistry(corpus: CompiledCorpus, found: CorpusDiagnostic[]): void {
  const registry = corpus.registry;
  if (registry === null) return;

  const paths = new Set(corpus.files.map((entry) => entry.path));
  for (const [name, destination] of Object.entries(registry.promotionDestinations)) {
    for (const [field, path] of [
      ["file", destination.file],
      ["optionalFile", destination.optionalFile],
    ] as const) {
      if (path === undefined) continue;
      if (path.includes("{")) {
        found.push({
          severity: "warning",
          code: "templated_promotion_destination",
          fileId: registry.id,
          at: `promotionDestinations.${name}.${field}`,
          message: `Promotion to "${name}" targets the template "${path}"; the concrete file depends on the pattern being promoted.`,
        });
        continue;
      }
      if (paths.has(path)) continue;
      found.push({
        severity: "error",
        code: "unresolved_promotion_destination",
        fileId: registry.id,
        at: `promotionDestinations.${name}.${field}`,
        message: `Promotion to "${name}" targets "${path}", which is not a file in the corpus.`,
      });
    }
  }

  const shared = new Set<string>(CORPUS_CONFIDENCE_LEVELS);
  const declared = new Set(Object.keys(registry.confidenceLevels));
  for (const level of shared) {
    if (declared.has(level)) continue;
    found.push({
      severity: "error",
      code: "confidence_ladder_mismatch",
      fileId: registry.id,
      at: `confidenceLevels.${level}`,
      message: `Records may carry confidence "${level}", but the registry does not define it.`,
    });
  }
  for (const level of declared) {
    if (shared.has(level)) continue;
    found.push({
      severity: "error",
      code: "confidence_ladder_mismatch",
      fileId: registry.id,
      at: `confidenceLevels.${level}`,
      message: `The registry defines confidence "${level}", which no record may carry.`,
    });
  }
}
