import { describe, expect, it } from "vitest";
import {
  BehaviorRuleSchema,
  CORPUS_FILE_LAYERS,
  CORPUS_FILE_TYPES,
  ConversationHeuristicSchema,
  CorpusFileHeaderSchema,
  CorpusFileSchema,
  CorpusIdSchema,
  CorpusSourceSchema,
  CorpusValueSchema,
  EvolutionPolicySchema,
  InteractionPrincipleSchema,
  InterviewFlowFileSchema,
  WeaveLimitationSchema,
  readCorpusSource,
} from "./weave-os";

const header = {
  id: "weave_interaction_principles",
  version: "1.0",
  status: "active",
  type: "interaction_principles",
} as const;

const provenance = { source: "authored", confidence: "design_hypothesis" } as const;

describe("provenance", () => {
  it("accepts the three source forms and rejects an untagged one", () => {
    expect(CorpusSourceSchema.parse("authored")).toBe("authored");
    expect(CorpusSourceSchema.parse("derived_from:Weave Interaction Philosophy.md")).toBeTruthy();
    expect(CorpusSourceSchema.parse("registry:creator_uncertain")).toBeTruthy();
    expect(() => CorpusSourceSchema.parse("somewhere")).toThrow();
    expect(() => CorpusSourceSchema.parse("registry:")).toThrow();
  });

  it("reads a source through one grammar rather than leaving callers to match prefixes", () => {
    expect(readCorpusSource("authored")).toEqual({ kind: "authored" });
    expect(readCorpusSource("registry:creator_wants_speed")).toEqual({
      kind: "registry",
      patternId: "creator_wants_speed",
    });
    expect(readCorpusSource("derived_from:principles.md")).toEqual({
      kind: "derived_from",
      ref: "principles.md",
    });
  });

  it("requires provenance on every record type — a record cannot omit where it came from", () => {
    const record = { id: "support_heart", name: "Support Heart", purpose: "p" };
    expect(() =>
      InteractionPrincipleSchema.parse({
        ...record,
        prioritize: ["empathy"],
        avoid: ["detachment"],
      }),
    ).toThrow();
    expect(() => WeaveLimitationSchema.parse({ id: "no_fabrication", statement: "x" })).toThrow();
    expect(() => BehaviorRuleSchema.parse({ id: "r", directive: "do", statement: "x" })).toThrow();
    expect(() =>
      ConversationHeuristicSchema.parse({
        id: "h",
        interpretation: "x",
        signals: ["s"],
        responseDirections: ["d"],
      }),
    ).toThrow();
  });

  it("defaults a record to active, so an inactive record is always a deliberate choice", () => {
    const parsed = WeaveLimitationSchema.parse({
      ...provenance,
      id: "fabricate_experiences",
      statement: "fabricate experiences",
    });
    expect(parsed.state).toBe("active");
    expect(
      WeaveLimitationSchema.parse({ ...provenance, id: "x", statement: "y", state: "inactive" })
        .state,
    ).toBe("inactive");
  });
});

describe("file header", () => {
  it("derives a layer for every file type instead of letting one be authored", () => {
    expect(Object.keys(CORPUS_FILE_LAYERS).sort()).toEqual([...CORPUS_FILE_TYPES].sort());
    expect(CORPUS_FILE_LAYERS.interaction_philosophy).toBe("root");
    expect(CORPUS_FILE_LAYERS.interview_flow).toBe("active");
    expect(CORPUS_FILE_LAYERS.pattern_registry).toBe("evolution");
    // No schema authors a layer — it can only be derived.
    expect(Object.keys(CorpusFileHeaderSchema.shape)).not.toContain("layer");
  });

  it("stores inheritance child-side only, with no parent-side field to disagree with it", () => {
    const parsed = CorpusFileHeaderSchema.parse({
      ...header,
      inherits: ["weave_interaction_philosophy"],
    });
    expect(parsed.inherits).toEqual(["weave_interaction_philosophy"]);
    for (const schema of [CorpusFileHeaderSchema, InterviewFlowFileSchema]) {
      expect(Object.keys(schema.shape)).not.toContain("inheritedBy");
    }
  });

  it("defaults inherits to empty so a root file need not declare it", () => {
    expect(CorpusFileHeaderSchema.parse(header).inherits).toEqual([]);
  });

  it("takes inherits as file ids, not paths — a path would restate the derived layer", () => {
    expect(() =>
      CorpusFileHeaderSchema.parse({
        ...header,
        inherits: ["root/weave_interaction_philosophy.yaml"],
      }),
    ).toThrow();
  });

  it("requires a quoted string version, since an unquoted YAML version parses as a number", () => {
    expect(CorpusFileHeaderSchema.parse({ ...header, version: "1.2" }).version).toBe("1.2");
    expect(CorpusFileHeaderSchema.parse({ ...header, version: "1.2.3" }).version).toBe("1.2.3");
    expect(() => CorpusFileHeaderSchema.parse({ ...header, version: 1.2 })).toThrow();
    expect(() => CorpusFileHeaderSchema.parse({ ...header, version: "v1" })).toThrow();
  });

  it("accepts only the statuses the corpus actually uses", () => {
    for (const status of ["in_progress", "development", "active"]) {
      expect(CorpusFileHeaderSchema.parse({ ...header, status }).status).toBe(status);
    }
    expect(() => CorpusFileHeaderSchema.parse({ ...header, status: "In progress" })).toThrow();
  });

  it("normalises last-updated to ISO rather than accepting an ambiguous local date", () => {
    expect(CorpusFileHeaderSchema.parse({ ...header, lastUpdated: "2026-07-14" }).lastUpdated).toBe(
      "2026-07-14",
    );
    expect(() => CorpusFileHeaderSchema.parse({ ...header, lastUpdated: "7/14/26" })).toThrow();
  });

  it("requires snake_case ids so records stay addressable by promotion actions", () => {
    expect(CorpusIdSchema.parse("support_heart")).toBe("support_heart");
    expect(() => CorpusIdSchema.parse("Support Heart")).toThrow();
    expect(() => CorpusIdSchema.parse("support-heart")).toThrow();
    expect(() => CorpusIdSchema.parse("1support")).toThrow();
  });
});

describe("evolution policy", () => {
  const policy = {
    architectAccess: "propose_changes",
    directModification: "prohibited",
    changeThreshold: "exceptional",
    validationRequired: true,
    humanApprovalRequired: true,
    acceptableReasons: ["repeated evidence across multiple active flows"],
    unacceptableReasons: ["easier implementation"],
  };

  it("carries both reason lists, so a ruled-out reason stays checkable in code", () => {
    const parsed = EvolutionPolicySchema.parse(policy);
    expect(parsed.unacceptableReasons).toContain("easier implementation");
    expect(parsed.acceptableReasons).toHaveLength(1);
  });

  it("rejects an unattested value rather than silently widening a governance scale", () => {
    expect(() => EvolutionPolicySchema.parse({ ...policy, changeThreshold: "routine" })).toThrow();
    expect(() =>
      EvolutionPolicySchema.parse({ ...policy, directModification: "allowed" }),
    ).toThrow();
  });
});

describe("root records", () => {
  it("keeps a principle's prioritize/avoid lists — they are the evaluation rubric", () => {
    const principle = InteractionPrincipleSchema.parse({
      ...provenance,
      id: "support_safety",
      name: "Support Safety",
      purpose: "Create a space where creators feel comfortable expressing what is true for them.",
      prioritize: ["encouragement", "listening"],
      avoid: ["judgment", "rushing"],
    });
    expect(principle.prioritize).toEqual(["encouragement", "listening"]);
    expect(principle.avoid).toEqual(["judgment", "rushing"]);
    // A principle with no rubric cannot be scored, so an empty list is rejected.
    expect(() => InteractionPrincipleSchema.parse({ ...principle, prioritize: [] })).toThrow();
  });

  it("models a limitation as its own type, not a principle with an empty rubric", () => {
    const limitation = WeaveLimitationSchema.parse({
      ...provenance,
      id: "manipulate_emotions",
      statement: "manipulate emotions",
    });
    expect(Object.keys(WeaveLimitationSchema.shape).sort()).toEqual([
      "confidence",
      "id",
      "source",
      "state",
      "statement",
    ]);
    // Nothing about a limitation is scored — it has no rubric to score against.
    expect(limitation).not.toHaveProperty("prioritize");
    expect(limitation).not.toHaveProperty("score");
  });

  it("keeps a behaviour rule atomic and says whether it is a do or an avoid", () => {
    const rule = BehaviorRuleSchema.parse({
      ...provenance,
      id: "revise_only_selected_target",
      directive: "do",
      statement: "Revise only the output the creator selected.",
      appliesPrinciples: ["support_clarity"],
    });
    expect(rule.directive).toBe("do");
    expect(rule.scope).toEqual([]);
    expect(typeof rule.statement).toBe("string");
    expect(() => BehaviorRuleSchema.parse({ ...rule, directive: "consider" })).toThrow();
  });

  it("gives a heuristic separable signals and directions, so two can be merged", () => {
    const parse = (id: string, signals: string[], directions: string[]) =>
      ConversationHeuristicSchema.parse({
        ...provenance,
        source: `registry:${id}`,
        id,
        interpretation: "The question may be too broad rather than unanswerable.",
        signals,
        responseDirections: directions,
      });

    const a = parse(
      "creator_uncertain",
      ["creator says they do not know"],
      ["reduce_question_scope"],
    );
    const b = parse(
      "creator_gives_short_answer",
      ["creator responds with one sentence"],
      ["accept_answer_when_sufficient"],
    );

    // A merge is expressible because both halves are lists, not prose.
    const merged = ConversationHeuristicSchema.parse({
      ...a,
      signals: [...a.signals, ...b.signals],
      responseDirections: [...a.responseDirections, ...b.responseDirections],
    });
    expect(merged.signals).toHaveLength(2);
    expect(merged.responseDirections).toHaveLength(2);
    // A heuristic with no signal could never be recognised, so it is rejected.
    expect(() => ConversationHeuristicSchema.parse({ ...a, signals: [] })).toThrow();
  });

  it("carries a promoted record's registry id as provenance", () => {
    const promoted = ConversationHeuristicSchema.parse({
      ...provenance,
      source: "registry:creator_wants_speed",
      confidence: "design_hypothesis",
      state: "inactive",
      id: "creator_wants_speed",
      interpretation: "Some creators prioritise reaching a usable result quickly.",
      signals: ["creator asks to make the process faster"],
      responseDirections: ["skip_optional_sections"],
    });
    expect(readCorpusSource(promoted.source)).toEqual({
      kind: "registry",
      patternId: "creator_wants_speed",
    });
    expect(promoted.state).toBe("inactive");
  });
});

describe("carried guidance", () => {
  it("validates authored guidance as well-formed data without interpreting its shape", () => {
    const authored = {
      option_limit: { minimum: 3, maximum: 5 },
      custom_direction: { always_include: true, counted_in_option_limit: false },
      prioritize: ["relevance_to_current_output", "low_cognitive_load"],
      note: null,
    };
    expect(CorpusValueSchema.parse(authored)).toEqual(authored);
    expect(() => CorpusValueSchema.parse({ callback: () => undefined })).toThrow();
    expect(() => CorpusValueSchema.parse(undefined)).toThrow();
  });
});

describe("interview flow file", () => {
  const flow = {
    id: "emerging_creator_onboarding",
    version: "1.1",
    status: "active",
    type: "interview_flow",
    inherits: ["weave_interaction_philosophy", "weave_interaction_principles"],
    purpose: "Help an emerging creator express an initial public identity.",
    framing: ["generated identity is provisional"],
    appliedPrinciples: ["support_clarity"],
    flowMap: {
      sequence: ["opening", "creator_or_project_name", "foundation_generation"],
      optionalBranches: { difficulty_answering: { leadsTo: ["softer_question", "skip_option"] } },
    },
    sessionState: {
      flowId: "emerging_creator_onboarding",
      currentStage: "opening",
      depthMode: "guided",
      slots: { collected: { creator_name: null }, completion: { published: false } },
    },
    stages: [
      {
        id: "opening",
        order: 0,
        purpose: "Establish comfort and give permission to begin imperfectly.",
        weave: { primary: "Hi — it's great to meet you." },
        actions: [{ id: "begin", label: "Yes, I'm ready" }, { id: "skip" }],
        captures: [{ id: "depth_mode", fields: { value: { values: ["quick", "guided"] } } }],
      },
      {
        id: "foundation_generation",
        order: 8,
        purpose: "Translate the creator's expression into an editable first profile.",
        outputs: [
          {
            id: "profile_headline",
            candidateCount: 3,
            recommendedCandidate: 1,
            constraints: {
              characterCount: { minimum: 50, maximum: 100 },
              include: ["what_the_creator_creates"],
              avoid: ["unsupported_superlatives"],
            },
          },
          { id: "foundability_feedback", public: false, showDuringReview: true },
        ],
        guidance: { generation_source: ["creator_confirmed_language", "origin"] },
      },
    ],
    minimumInformation: { requiredForGeneration: ["offering_expression"] },
    evaluationSignals: { friction: ["skipped_question", "rejected_output"] },
    guidance: { creator_context: { intended_for: ["creators beginning a new project"] } },
  };

  it("parses an authored flow through the one corpus-file entry point", () => {
    const parsed = CorpusFileSchema.parse(flow);
    expect(parsed.type).toBe("interview_flow");
    if (parsed.type !== "interview_flow") throw new Error("unreachable");
    expect(parsed.stages).toHaveLength(2);
    expect(parsed.flowMap.sequence[0]).toBe("opening");
  });

  it("types applied principles as ids, so an unresolved reference cannot read as prose", () => {
    expect(InterviewFlowFileSchema.parse(flow).appliedPrinciples).toEqual(["support_clarity"]);
    expect(() =>
      InterviewFlowFileSchema.parse({ ...flow, appliedPrinciples: ["Support Clarity"] }),
    ).toThrow();
  });

  it("lets a branch lead somewhere that is not a stage, as the authored flow does", () => {
    const parsed = InterviewFlowFileSchema.parse(flow);
    const targets = parsed.flowMap.optionalBranches.difficulty_answering?.leadsTo ?? [];
    expect(targets).toEqual(["softer_question", "skip_option"]);
    for (const target of targets) expect(parsed.flowMap.sequence).not.toContain(target);
  });

  it("keeps stage copy as an open map of named utterances", () => {
    const stage = InterviewFlowFileSchema.parse({
      ...flow,
      stages: [
        {
          ...flow.stages[0],
          weave: { primary: "a", softer_alternative: "b", grounded_alternative: "c" },
        },
      ],
    }).stages[0];
    expect(Object.keys(stage?.weave ?? {})).toHaveLength(3);
  });

  it("normalises an output's constraints and its four visibility flags", () => {
    const generation = InterviewFlowFileSchema.parse(flow).stages[1];
    const headline = generation?.outputs[0];
    expect(headline?.constraints.characterCount).toEqual({ minimum: 50, maximum: 100 });
    expect(headline?.public).toBe(true);
    const supporting = generation?.outputs[1];
    expect(supporting?.public).toBe(false);
    expect(supporting?.showDuringReview).toBe(true);
    expect(supporting?.usedForGeneration).toBe(false);
  });

  it("carries every unmodelled authored block rather than dropping it", () => {
    const parsed = InterviewFlowFileSchema.parse(flow);
    expect(parsed.guidance.creator_context).toEqual({
      intended_for: ["creators beginning a new project"],
    });
    expect(parsed.stages[1]?.guidance.generation_source).toEqual([
      "creator_confirmed_language",
      "origin",
    ]);
  });

  it("hosts a session-state bucket it was not designed around", () => {
    const parsed = InterviewFlowFileSchema.parse({
      ...flow,
      id: "member_intent_conversation",
      sessionState: {
        flowId: "member_intent_conversation",
        currentStage: "opening",
        slots: { collected: { stated_interest: null }, completion: { followed: false } },
      },
    });
    expect(Object.keys(parsed.sessionState.slots)).toEqual(["collected", "completion"]);
  });

  it("rejects a flow with no stages or an empty sequence", () => {
    expect(() => InterviewFlowFileSchema.parse({ ...flow, stages: [] })).toThrow();
    expect(() =>
      InterviewFlowFileSchema.parse({ ...flow, flowMap: { ...flow.flowMap, sequence: [] } }),
    ).toThrow();
  });

  it("rejects a file type that has no modelled body, rather than half-parsing it", () => {
    expect(() => CorpusFileSchema.parse({ ...flow, type: "pattern_registry" })).toThrow();
  });
});
