import { z } from "zod";

/**
 * The Weave OS corpus contracts — the shared vocabulary for Weave's authored behaviour.
 *
 * ## The module
 *
 * Weave's behaviour is authored as a versioned corpus of YAML files (a philosophy, a set
 * of interaction principles, behaviour rules, conversation heuristics, and one file per
 * creator-facing flow). This module is the schema set every package agrees on: what a
 * corpus file looks like, what a record looks like, and where a record came from. It
 * contains no parsing, no inheritance resolution, and no prompt composition — those are
 * the large implementation behind `@resonance/weave-os`'s resolver seam.
 *
 * ## Why the contracts live here and not in `weave-os`
 *
 * Four packages must agree on these shapes: `@resonance/weave-os` parses and validates
 * them, `@resonance/ai` composes prompts from them, `@resonance/db` stores evidence keyed
 * to them, and the evolution harness scores conversations against them. `core` is the only
 * package all four may depend on (ADR-0003).
 *
 * ## What is typed and what is carried
 *
 * The authored files contain far more structure than the product consumes today. Typing
 * every authored key would copy one creator flow's specifics into the shared vocabulary
 * and make it unable to host any other flow. So the rule is: **type what something
 * consumes, carry what nothing consumes yet.** Headers, inheritance, principles,
 * limitations, rules, heuristics, the flow map, stages, captures, actions and output
 * constraints are typed because the resolver, the prompt composer, the cross-file
 * validator or the evaluator reads them. Everything else an author writes is carried
 * verbatim as {@link CorpusValue} guidance — validated as well-formed data, never
 * interpreted. The gap between what the corpus specifies and what the runtime consumes is
 * deliberate and measurable; it is what the evolution engine will later score against.
 *
 * ## Deletion test
 *
 * Delete this module and the same shapes reappear in four packages at once, each free to
 * disagree about what a principle id is, whether inheritance points up or down, and what
 * provenance a record carries. Evidence would stop being attributable: `db` would key
 * observations to a release id that `weave-os` defines differently. The module earns its
 * keep as the single definition of the corpus's vocabulary.
 *
 * @see docs/adr/0017-design-deep-modules.md
 * @see docs/adr/0003-package-boundaries-as-context-boundaries.md
 */

// ---------------------------------------------------------------------------
// Identifiers and authored values
// ---------------------------------------------------------------------------

/**
 * A stable, addressable identifier for a corpus file or record.
 *
 * Records need stable ids because the corpus is edited by promotion actions that name a
 * single record — refining one principle, splitting one pattern into several rules,
 * merging one heuristic into another, updating one stage. None of those are expressible
 * against a positional or prose-derived key.
 */
export const CorpusIdSchema = z.string().regex(/^[a-z][a-z0-9_]*$/);
export type CorpusId = z.infer<typeof CorpusIdSchema>;

/**
 * Any value an author may write into a corpus file: the JSON/YAML data domain.
 *
 * This is the carrier for authored guidance the runtime does not consume — a stage's
 * bespoke refinement machinery, a flow's evolution boundaries, a philosophy's prose
 * blocks. It validates that the content is well-formed data and nothing more, which is
 * the point: guessing a schema for content no code reads would put words in the author's
 * mouth. When a consumer appears for one of these blocks, it graduates to a typed field.
 */
export type CorpusValue =
  | string
  | number
  | boolean
  | null
  | CorpusValue[]
  | { [key: string]: CorpusValue };
export const CorpusValueSchema: z.ZodType<CorpusValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(CorpusValueSchema),
    z.record(z.string(), CorpusValueSchema),
  ]),
);

/** A block of authored guidance, keyed by the name the author gave it. */
export const GuidanceSchema = z.record(z.string().min(1), CorpusValueSchema);
export type Guidance = z.infer<typeof GuidanceSchema>;

// ---------------------------------------------------------------------------
// Provenance — where a record came from and how much it is trusted
// ---------------------------------------------------------------------------

/**
 * How strongly a record is believed, on the ladder the corpus's own pattern registry
 * defines. Reused rather than re-invented so a record promoted out of the registry keeps
 * the confidence it earned there.
 */
export const CORPUS_CONFIDENCE_LEVELS = [
  "design_hypothesis",
  "early_signal",
  "emerging_pattern",
  "validated_pattern",
  "high_confidence",
] as const;
export const CorpusConfidenceSchema = z.enum(CORPUS_CONFIDENCE_LEVELS);
export type CorpusConfidence = z.infer<typeof CorpusConfidenceSchema>;

/**
 * Where a record came from, as one scalar so it round-trips through YAML unchanged.
 *
 * Three forms:
 * - `authored` — written directly by a human author.
 * - `derived_from:<ref>` — normalised out of a source document; `<ref>` names it.
 * - `registry:<pattern-id>` — promoted out of the pattern registry.
 *
 * Provenance is mandatory on every record because a corpus that has been transcribed and
 * normalised looks exactly as authoritative as one that was authored, and the difference
 * matters to whoever reviews a change. Read it with {@link readCorpusSource} rather than
 * matching the string yourself.
 */
export const CorpusSourceSchema = z
  .string()
  .regex(/^(authored|derived_from:[A-Za-z0-9_.\-/ ]+|registry:[a-z][a-z0-9_]*)$/);
export type CorpusSource = z.infer<typeof CorpusSourceSchema>;

/** The parsed form of a {@link CorpusSource}. */
export type CorpusSourceRef =
  | { readonly kind: "authored" }
  | { readonly kind: "derived_from"; readonly ref: string }
  | { readonly kind: "registry"; readonly patternId: CorpusId };

/**
 * Read a validated {@link CorpusSource}. Defined once here so the grammar has exactly one
 * reader; callers branch on `kind` instead of on a prefix.
 */
export function readCorpusSource(source: CorpusSource): CorpusSourceRef {
  if (source === "authored") return { kind: "authored" };
  const separator = source.indexOf(":");
  const value = source.slice(separator + 1);
  return source.startsWith("registry:")
    ? { kind: "registry", patternId: value }
    : { kind: "derived_from", ref: value };
}

/**
 * Whether a record is composed into runtime behaviour.
 *
 * `inactive` records are present, addressable and promotable but never reach a prompt.
 * That is how an observation captured in the pattern registry can live in the corpus,
 * carry its registry id as provenance, and still not change what Weave says.
 */
export const CORPUS_RECORD_STATES = ["active", "inactive"] as const;
export const CorpusRecordStateSchema = z.enum(CORPUS_RECORD_STATES);
export type CorpusRecordState = z.infer<typeof CorpusRecordStateSchema>;

/** The provenance every corpus record carries. Spread into each record's shape. */
const recordShape = {
  id: CorpusIdSchema,
  source: CorpusSourceSchema,
  confidence: CorpusConfidenceSchema,
  state: CorpusRecordStateSchema.default("active"),
} as const;

export const CorpusProvenanceSchema = z.object({
  source: CorpusSourceSchema,
  confidence: CorpusConfidenceSchema,
});
export type CorpusProvenance = z.infer<typeof CorpusProvenanceSchema>;

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

/**
 * The kinds of file the corpus contains. Root files hold shared guidance inherited by
 * many conversations; active files define one creator-facing experience; the pattern
 * registry holds observations that are not inherited by any conversation.
 */
export const CORPUS_FILE_TYPES = [
  "interaction_philosophy",
  "interaction_principles",
  "behavior_rules",
  "conversation_heuristics",
  "specialized_root_module",
  "interview_flow",
  "pattern_registry",
] as const;
export const CorpusFileTypeSchema = z.enum(CORPUS_FILE_TYPES);
export type CorpusFileType = z.infer<typeof CorpusFileTypeSchema>;

/** Which tier of the corpus a file sits in. */
export const CORPUS_LAYERS = ["root", "active", "evolution"] as const;
export const CorpusLayerSchema = z.enum(CORPUS_LAYERS);
export type CorpusLayer = z.infer<typeof CorpusLayerSchema>;

/**
 * A file's layer follows from its type, so it is derived here rather than authored. An
 * authored layer field would be a second source of truth that could disagree with the
 * type, and the disagreement would decide whether a file reaches a runtime prompt.
 */
export const CORPUS_FILE_LAYERS: Readonly<Record<CorpusFileType, CorpusLayer>> = Object.freeze({
  interaction_philosophy: "root",
  interaction_principles: "root",
  behavior_rules: "root",
  conversation_heuristics: "root",
  specialized_root_module: "root",
  interview_flow: "active",
  pattern_registry: "evolution",
});

/**
 * A file's publication status. These are exactly the statuses the authored corpus uses;
 * widening the set is a deliberate schema change, not something a new file may assume.
 */
export const CORPUS_FILE_STATUSES = ["in_progress", "development", "active"] as const;
export const CorpusFileStatusSchema = z.enum(CORPUS_FILE_STATUSES);
export type CorpusFileStatus = z.infer<typeof CorpusFileStatusSchema>;

/**
 * The rules governing how a file may change.
 *
 * `acceptableReasons` and `unacceptableReasons` are the load-bearing pair: they are the
 * author's own statement of what does and does not justify editing a file, and they are
 * carried into code so a future automated proposal cannot be waved through on a reason
 * the author already ruled out. The three enum fields have exactly one attested value
 * each; adding a member is a deliberate schema change made with the author.
 */
export const EvolutionPolicySchema = z.object({
  architectAccess: z.enum(["propose_changes"]),
  directModification: z.enum(["prohibited"]),
  changeThreshold: z.enum(["exceptional"]),
  validationRequired: z.boolean(),
  humanApprovalRequired: z.boolean(),
  acceptableReasons: z.array(z.string().min(1)).default([]),
  unacceptableReasons: z.array(z.string().min(1)).default([]),
});
export type EvolutionPolicy = z.infer<typeof EvolutionPolicySchema>;

/**
 * The header every corpus file carries.
 *
 * **Inheritance is stored child-side only.** A file names the files it inherits from;
 * nothing names its children. The corpus's source documents express the edge in both
 * directions, but parent-side storage would mean that adding any new root file requires
 * editing the philosophy — the single most protected file in the corpus, whose own policy
 * sets `changeThreshold: exceptional`. Storing the edge on the child keeps a new file's
 * cost proportional to the file. The parent-side view still exists, as
 * {@link CorpusInheritedBy}, computed by the resolver and never authored.
 *
 * `inherits` holds file ids, not paths: a file's layer is derived from its type, so a
 * path would duplicate that and could disagree with it.
 */
export const CorpusFileHeaderSchema = z.object({
  id: CorpusIdSchema,
  /** `major.minor` or `major.minor.patch`. Quote it in YAML — `1.2` unquoted parses as a number. */
  version: z.string().regex(/^\d+\.\d+(\.\d+)?$/),
  status: CorpusFileStatusSchema,
  type: CorpusFileTypeSchema,
  author: z.string().min(1).optional(),
  /** ISO `YYYY-MM-DD`. Source documents use local date formats; transcription normalises. */
  lastUpdated: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  inherits: z.array(CorpusIdSchema).default([]),
  evolutionPolicy: EvolutionPolicySchema.optional(),
});
export type CorpusFileHeader = z.infer<typeof CorpusFileHeaderSchema>;

/**
 * The parent-side view of inheritance: for each file, the files that inherit it.
 *
 * A derived view, computed from every file's `inherits` by `@resonance/weave-os`. There is
 * deliberately no schema for it — making it parseable would make it storable, and a stored
 * copy is a second source of truth that can disagree with the child-side edge.
 */
export type CorpusInheritedBy = ReadonlyMap<CorpusId, readonly CorpusId[]>;

/**
 * The identity of one compiled, validated corpus.
 *
 * Opaque: produced by `@resonance/weave-os`, pinned once at the start of a conversation,
 * and stamped onto every piece of evidence that conversation produces. Callers pass it
 * through unchanged and never parse it. Pinning is what makes evidence attributable — an
 * interview that spans a release must be scored against the corpus that actually produced
 * it, not whichever one is current when the scoring runs.
 */
export const OsReleaseIdSchema = z.string().min(1);
export type OsReleaseId = z.infer<typeof OsReleaseIdSchema>;

// ---------------------------------------------------------------------------
// Root records
// ---------------------------------------------------------------------------

/**
 * One interaction principle: a quality every interaction should preserve.
 *
 * `prioritize` and `avoid` are not decoration — they are the authored rubric an evaluator
 * scores a transcript against, which is why a principle is scored per-principle rather
 * than as one undifferentiated "principle alignment" number (see `weave-evaluation.ts`).
 */
export const InteractionPrincipleSchema = z.object({
  ...recordShape,
  /** Human-facing name, e.g. "Support Heart". */
  name: z.string().min(1),
  purpose: z.string().min(1),
  prioritize: z.array(z.string().min(1)).min(1),
  avoid: z.array(z.string().min(1)).min(1),
});
export type InteractionPrinciple = z.infer<typeof InteractionPrincipleSchema>;

/**
 * One thing Weave will never do.
 *
 * A separate record type from {@link InteractionPrincipleSchema} because it is a different
 * kind of statement. A principle is a quality held to a degree and is meaningfully scored
 * 0–3. A limitation is an invariant: it is either held or it is breached, and a "mostly
 * held" limitation is a breach. Scoring one on the principle scale would let a violation
 * be averaged away.
 */
export const WeaveLimitationSchema = z.object({
  ...recordShape,
  /** The clause completing "Weave will never …", e.g. "fabricate experiences". */
  statement: z.string().min(1),
});
export type WeaveLimitation = z.infer<typeof WeaveLimitationSchema>;

/**
 * One observable behaviour Weave consistently performs or avoids.
 *
 * Deliberately atomic — one rule, one behaviour — because a pattern may be promoted by
 * being split into several rules, and a rule that bundles two behaviours cannot be split,
 * refined, or observed as kept-or-broken.
 */
export const BehaviorRuleSchema = z.object({
  ...recordShape,
  /** Whether the rule says to perform the behaviour or to refrain from it. */
  directive: z.enum(["do", "avoid"]),
  statement: z.string().min(1),
  /** Principle ids this rule translates into observable behaviour. */
  appliesPrinciples: z.array(CorpusIdSchema).default([]),
  /** Flow ids the rule is scoped to. Empty means every flow. */
  scope: z.array(CorpusIdSchema).default([]),
});
export type BehaviorRule = z.infer<typeof BehaviorRuleSchema>;

/**
 * One contextual interpretation of an ambiguous creator signal, plus the response
 * directions worth considering.
 *
 * Structured rather than prose because a heuristic may be promoted by being merged with a
 * related one, and merging is only meaningful when signals and response directions are
 * separable lists. `interpretation` states a possibility; `limitations` records where it
 * does not hold. Neither is ever a permanent claim about a creator.
 */
export const ConversationHeuristicSchema = z.object({
  ...recordShape,
  /** What may be happening, stated as a possibility rather than a finding. */
  interpretation: z.string().min(1),
  /** Observable signals that may indicate it. */
  signals: z.array(z.string().min(1)).min(1),
  /** Directions worth considering in response. Guidance, not a required action. */
  responseDirections: z.array(z.string().min(1)).min(1),
  /** Where the interpretation is known not to hold. */
  limitations: z.array(z.string().min(1)).default([]),
});
export type ConversationHeuristic = z.infer<typeof ConversationHeuristicSchema>;

// ---------------------------------------------------------------------------
// Flow records
// ---------------------------------------------------------------------------

/**
 * One value slot a flow reads or writes.
 *
 * `values` closes the set when the author declared one; an empty `values` means free form.
 * `shape` carries the author's own informal note about a free-form slot (`"string | null"`)
 * verbatim — the source documents describe slot shapes inconsistently, so this records
 * what was written instead of inventing a type system to parse it into.
 */
export const CorpusFieldSchema = z.object({
  values: z.array(z.string().min(1)).default([]),
  shape: z.string().min(1).optional(),
});
export type CorpusField = z.infer<typeof CorpusFieldSchema>;

/** What a stage records into session state. */
export const FlowCaptureSchema = z.object({
  id: CorpusIdSchema,
  fields: z.record(z.string().min(1), CorpusFieldSchema).default({}),
});
export type FlowCapture = z.infer<typeof FlowCaptureSchema>;

/** A choice offered at a stage. Authors may write a bare id; transcription adds the label. */
export const FlowActionSchema = z.object({
  id: CorpusIdSchema,
  label: z.string().min(1).optional(),
});
export type FlowAction = z.infer<typeof FlowActionSchema>;

/** An inclusive bound. Both ends are optional so a one-sided constraint stays expressible. */
export const BoundsSchema = z.object({
  minimum: z.number().int().nonnegative().optional(),
  maximum: z.number().int().nonnegative().optional(),
});
export type Bounds = z.infer<typeof BoundsSchema>;

/**
 * What a generated output must satisfy.
 *
 * Normalised from the several vocabularies the source documents use for the same idea:
 * character and item bounds collapse into `characterCount` / `itemCount`, the
 * "should express" and "may include" lists collapse into `include`, and free-standing
 * sentences become `rules`. Generation validates against this; it is not prompt copy.
 */
export const OutputConstraintsSchema = z.object({
  characterCount: BoundsSchema.optional(),
  itemCount: BoundsSchema.optional(),
  include: z.array(z.string().min(1)).default([]),
  avoid: z.array(z.string().min(1)).default([]),
  rules: z.array(z.string().min(1)).default([]),
});
export type OutputConstraints = z.infer<typeof OutputConstraintsSchema>;

/**
 * One artefact a stage generates.
 *
 * The visibility flags are separate booleans rather than one enum because the source
 * distinguishes four independent things: whether an output is published, whether it feeds
 * later generation, whether the creator sees it while reviewing, and whether the creator
 * may correct it. A supporting output is typically not public but is all three of the
 * others.
 */
export const FlowOutputSchema = z.object({
  id: CorpusIdSchema,
  /** How many candidates to generate, when the flow asks for a choice. */
  candidateCount: z.number().int().positive().optional(),
  /** Which candidate to present as recommended, 1-based. */
  recommendedCandidate: z.number().int().positive().optional(),
  /** Conditions under which the output is generated at all. Empty means always. */
  generateWhen: z.array(z.string().min(1)).default([]),
  /** Which captured material the output is generated from. */
  sources: z.array(z.string().min(1)).default([]),
  /** Sub-fields, when the output is structured rather than a single value. */
  fields: z.record(z.string().min(1), CorpusFieldSchema).default({}),
  constraints: OutputConstraintsSchema.default({}),
  public: z.boolean().default(true),
  usedForGeneration: z.boolean().default(false),
  showDuringReview: z.boolean().default(true),
  creatorCanCorrect: z.boolean().default(true),
});
export type FlowOutput = z.infer<typeof FlowOutputSchema>;

/**
 * One stage of a flow.
 *
 * Addressable by id because a pattern may be promoted by updating one existing stage.
 * `weave` is the stage's authored copy keyed by the role each utterance plays (`primary`,
 * `support`, `softer_alternative`, …); the role names are flow-local vocabulary, so the
 * map is open. `guidance` carries every other block the author wrote for this stage —
 * validated as data, not interpreted (see the module note on typed versus carried).
 */
export const FlowStageSchema = z.object({
  id: CorpusIdSchema,
  order: z.number().int().nonnegative(),
  purpose: z.string().min(1),
  /** Whether the creator may pass through without answering. */
  optional: z.boolean().default(false),
  weave: z.record(z.string().min(1), z.string().min(1)).default({}),
  actions: z.array(FlowActionSchema).default([]),
  captures: z.array(FlowCaptureSchema).default([]),
  outputs: z.array(FlowOutputSchema).default([]),
  guardrails: z.array(z.string().min(1)).default([]),
  avoidLanguage: z.array(z.string().min(1)).default([]),
  skipBehavior: z.array(z.string().min(1)).default([]),
  guidance: GuidanceSchema.default({}),
});
export type FlowStage = z.infer<typeof FlowStageSchema>;

/**
 * The order stages run in, plus the branches a conversation may take.
 *
 * A branch's `leadsTo` entries are flow-local response directions, **not** necessarily
 * stage ids — the authored flow branches to targets that are not in its own sequence.
 * Resolving them against stages would reject the corpus's own files.
 */
export const FlowMapSchema = z.object({
  sequence: z.array(CorpusIdSchema).min(1),
  optionalBranches: z
    .record(z.string().min(1), z.object({ leadsTo: z.array(z.string().min(1)).min(1) }))
    .default({}),
});
export type FlowMap = z.infer<typeof FlowMapSchema>;

/**
 * The state a flow tracks across a conversation, declared with its initial values.
 *
 * `slots` is a two-level map — named bucket, then named slot — because that is how the
 * authored flow groups state (what was collected, what was generated, what the creator
 * selected, and so on). Bucket and slot names are flow-local, which is what lets this
 * schema host a flow it was not designed around.
 */
export const FlowSessionStateSchema = z.object({
  flowId: CorpusIdSchema,
  /** The stage a conversation starts in. */
  currentStage: CorpusIdSchema,
  /** How much depth the conversation runs at, when the flow offers a choice. */
  depthMode: z.string().min(1).optional(),
  slots: z.record(z.string().min(1), z.record(z.string().min(1), CorpusValueSchema)).default({}),
});
export type FlowSessionState = z.infer<typeof FlowSessionStateSchema>;

/** What a flow needs before it may generate, and what merely improves the result. */
export const MinimumInformationSchema = z.object({
  requiredForGeneration: z.array(z.string().min(1)).default([]),
  recommended: z.array(z.string().min(1)).default([]),
  optional: z.array(z.string().min(1)).default([]),
  /** How to behave when recommended information is missing. */
  rule: z.string().min(1).optional(),
});
export type MinimumInformation = z.infer<typeof MinimumInformationSchema>;

// ---------------------------------------------------------------------------
// Files, as a discriminated union
// ---------------------------------------------------------------------------

/** The philosophy: the deepest frame, carried as authored guidance plus its invariants. */
export const InteractionPhilosophyFileSchema = CorpusFileHeaderSchema.extend({
  type: z.literal("interaction_philosophy"),
  blocks: GuidanceSchema.default({}),
  limitations: z.array(WeaveLimitationSchema).default([]),
});
export type InteractionPhilosophyFile = z.infer<typeof InteractionPhilosophyFileSchema>;

/** The principles: the qualities every interaction preserves, and the evaluation rubric. */
export const InteractionPrinciplesFileSchema = CorpusFileHeaderSchema.extend({
  type: z.literal("interaction_principles"),
  principles: z.array(InteractionPrincipleSchema).min(1),
});
export type InteractionPrinciplesFile = z.infer<typeof InteractionPrinciplesFileSchema>;

/** Behaviour rules: principles translated into observable actions. */
export const BehaviorRulesFileSchema = CorpusFileHeaderSchema.extend({
  type: z.literal("behavior_rules"),
  rules: z.array(BehaviorRuleSchema).default([]),
});
export type BehaviorRulesFile = z.infer<typeof BehaviorRulesFileSchema>;

/** Conversation heuristics: how Weave reasons when a signal has several plausible meanings. */
export const ConversationHeuristicsFileSchema = CorpusFileHeaderSchema.extend({
  type: z.literal("conversation_heuristics"),
  heuristics: z.array(ConversationHeuristicSchema).default([]),
});
export type ConversationHeuristicsFile = z.infer<typeof ConversationHeuristicsFileSchema>;

/**
 * One creator-facing conversation: its stages, branching, state and outputs.
 *
 * `appliedPrinciples` holds principle ids and must resolve against the principles file.
 * It is typed as ids rather than prose precisely so an unresolved reference fails loudly
 * instead of reading as documentation.
 *
 * The schema is flow-shaped, not creator-shaped: nothing here names a creator concept, so
 * a member-facing flow is expressible without a schema change. No such flow is authored
 * yet, and this module deliberately does not invent one.
 */
export const InterviewFlowFileSchema = CorpusFileHeaderSchema.extend({
  type: z.literal("interview_flow"),
  purpose: z.string().min(1),
  /** How the conversation frames what it produces, e.g. that outputs are proposals. */
  framing: z.array(z.string().min(1)).default([]),
  appliedPrinciples: z.array(CorpusIdSchema).default([]),
  flowMap: FlowMapSchema,
  sessionState: FlowSessionStateSchema,
  stages: z.array(FlowStageSchema).min(1),
  minimumInformation: MinimumInformationSchema.default({}),
  /** Observable signals this flow declares, grouped by what they measure. */
  evaluationSignals: z.record(z.string().min(1), z.array(z.string().min(1))).default({}),
  guidance: GuidanceSchema.default({}),
});
export type InterviewFlowFile = z.infer<typeof InterviewFlowFileSchema>;

/**
 * Any corpus file with a modelled body — one entry point for parsing the corpus.
 *
 * `specialized_root_module` and `pattern_registry` are named in {@link CORPUS_FILE_TYPES}
 * because approval tiers and layer derivation refer to them, but neither has a body schema
 * here: no specialised module has been authored, and the registry's rulebook and its
 * accumulating evidence records are split across `@resonance/weave-os` and
 * `@resonance/db`. Both are additions to this union when they land.
 */
export const CorpusFileSchema = z.discriminatedUnion("type", [
  InteractionPhilosophyFileSchema,
  InteractionPrinciplesFileSchema,
  BehaviorRulesFileSchema,
  ConversationHeuristicsFileSchema,
  InterviewFlowFileSchema,
]);
export type CorpusFile = z.infer<typeof CorpusFileSchema>;
