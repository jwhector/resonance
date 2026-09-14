import { z } from "zod";
import { NotImplementedError } from "./errors";
import {
  CommitProfileInputSchema,
  CreatorProfileDraftSchema,
  type CommitProfileInput,
} from "./profile-draft";

/**
 * Creator onboarding — the staged-interview contract, and the two seams behind which the
 * whole flow is replaceable.
 *
 * Two **interfaces** live here. {@link CreatorOnboardingBehavior} decides what the creator
 * is asked and what happens when they answer; {@link CreatorOnboardingSessionStore} decides
 * how that progress survives a reload. Behind each sits a large **implementation** nothing
 * else can see: a stage machine with per-stage eligibility, skip semantics and generation
 * gating on one side, and an owned-row, optimistically-versioned, self-erasing persistence
 * pipeline on the other. Callers learn four methods and three data shapes and get a
 * resumable eleven-stage interview that ends in a published profile. That ratio is the
 * **depth**.
 *
 * ## Why the contract lives here
 *
 * Four packages must agree on the same shapes. `@resonance/ai` implements the behaviour,
 * `@resonance/db` implements the store, `@resonance/ui` renders a stage without knowing
 * which stage it is, and `apps/web` carries commands from the browser to both ports. `core`
 * is the only package all four may depend on (ADR-0003), so the vocabulary lives here and
 * `ui`/`web` never see a prompt string, a SQL row, or a model call.
 *
 * ## Two properties the types enforce rather than describe
 *
 * **No transcript.** Assistant prose exists only on {@link StageRenderModel}, which is
 * derived per render and never stored. {@link CreatorOnboardingSessionSchema} has nowhere to
 * put a message, so "structured answers, not conversation" cannot be violated by accident.
 *
 * **Raw answers do not outlive the commit.** The session is a union discriminated on
 * `status`: an in-progress session carries slots and a draft, a completed one carries only
 * version/completion metadata and the public profile that was published. A completed
 * session has no field capable of holding a private answer, so post-commit cleanup is a
 * parse error away from regressing rather than a convention someone must remember.
 *
 * ## Deletion test
 *
 * Delete this module and the complexity does not vanish; it reappears in four places and
 * then drifts. `ai` and `web` would each hand-roll a stage vocabulary, `ui` would grow one
 * component per screen instead of one renderer, and `db` would invent a session shape only
 * it could read. Worse, the flow would stop being swappable: replacing the hand-modelled
 * stages with a corpus-driven provider would mean editing the UI, the routes and the schema,
 * because there would be no seam to change behind.
 *
 * ## Adapters at these seams
 *
 * Two each, so both seams are real rather than hypothetical. The behaviour seam has the
 * `snapshot-v1` implementation in `@resonance/ai` and the deterministic fake in
 * `creator-onboarding.test.ts`; a later Weave OS adapter is the variance this seam exists
 * to absorb. The store seam has the `@resonance/db` adapter and the in-memory fake in the
 * same test file.
 *
 * @see docs/adr/0022-creator-onboarding-staged-runtime.md — the ratified boundary
 * @see docs/adr/0020-weave-os-corpus-governance-and-runner-boundary.md — why the corpus is not a runtime dependency
 * @see docs/adr/0017-design-deep-modules.md
 * @see ./discovery.ts — the same construction, for ranking
 */

/**
 * The eleven stages of the approved emerging-creator interview, in flow order.
 *
 * Each maps to a captured design state: opening `1473:81547`, name `1473:81553`, offering
 * `1473:81556`, origin `1473:81565`, intended experience `1473:81568`, resonance moment
 * `1473:81571`, resonant people `1473:81574`, expression style `1556:79716`, summary
 * `1485:48994`, foundation `2065:58399`, completion `1443:78273`.
 *
 * Declaration order *is* flow order here — unlike the discovery tabs, progress and "which
 * stage comes next" are contract, not presentation. The established-creator row and the
 * deferred field-by-field refinement frames are deliberately not stages (ADR-0022).
 */
export const CREATOR_ONBOARDING_STAGES = [
  "opening",
  "creator_name",
  "offering",
  "origin",
  "intended_experience",
  "resonance_moment",
  "resonant_people",
  "expression_style",
  "summary",
  "foundation",
  "completion",
] as const;

export const CreatorOnboardingStageSchema = z.enum(CREATOR_ONBOARDING_STAGES);
export type CreatorOnboardingStage = z.infer<typeof CreatorOnboardingStageSchema>;

/** How many stages a progress indicator counts against. */
export const CREATOR_ONBOARDING_STAGE_COUNT = CREATOR_ONBOARDING_STAGES.length;

/**
 * The stages whose answers are *required* before a profile can be generated. Everything
 * else improves the result without blocking it — including the creator's own name.
 *
 * Vocabulary, not logic: `ai` enforces it, `ui` never needs to know it, and a test can
 * assert the gate without reimplementing it.
 */
export const CREATOR_ONBOARDING_GENERATION_REQUIRES = [
  "offering",
  "intended_experience",
] as const satisfies readonly CreatorOnboardingStage[];

/**
 * The behaviour versions this codebase can interpret.
 *
 * A **closed** enum on purpose. Every session is pinned to the version that produced it, so
 * a session written by a future provider fails to parse instead of being silently
 * reinterpreted by rules it never ran under. Widening this list is the explicit migration
 * step a later Weave OS adapter has to take (ADR-0022).
 */
export const CREATOR_ONBOARDING_BEHAVIOR_VERSIONS = ["snapshot-v1"] as const;
export const CreatorOnboardingBehaviorVersionSchema = z.enum(CREATOR_ONBOARDING_BEHAVIOR_VERSIONS);
export type CreatorOnboardingBehaviorVersion = z.infer<
  typeof CreatorOnboardingBehaviorVersionSchema
>;

/**
 * One answer the creator gave. `text` is a structured slot value — the thing they said in
 * answer to one question — not a rendered turn of conversation.
 *
 * `choice` carries the stable option id, never the rendered label, so a provider can restyle
 * or retranslate its options without orphaning stored answers. `customText` is the "Custom
 * direction" escape on the expression-style stage (`1556:79716`).
 */
export const CreatorOnboardingAnswerSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string().min(1).max(4000) }),
  z.object({
    kind: z.literal("choice"),
    choiceId: z.string().min(1).max(64),
    customText: z.string().min(1).max(4000).optional(),
  }),
]);
export type CreatorOnboardingAnswer = z.infer<typeof CreatorOnboardingAnswerSchema>;

/**
 * One stage's slot. Discriminated on `status` so "answered" cannot exist without an answer
 * and a skipped stage has nowhere to leave one behind.
 *
 * `skipped` is a real, resumable outcome, not an absence: the designs offer Skip and "I want
 * to do it later" as first-class actions, and a provider needs to tell "declined" from "not
 * reached yet" when it decides what to ask next.
 */
export const CreatorOnboardingSlotSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("pending") }),
  z.object({ status: z.literal("skipped") }),
  z.object({ status: z.literal("answered"), answer: CreatorOnboardingAnswerSchema }),
]);
export type CreatorOnboardingSlot = z.infer<typeof CreatorOnboardingSlotSchema>;

/** Slots by stage. Partial: a stage absent from the record has not been reached. */
export const CreatorOnboardingSlotsSchema = z.record(
  CreatorOnboardingStageSchema,
  CreatorOnboardingSlotSchema,
);
export type CreatorOnboardingSlots = z.infer<typeof CreatorOnboardingSlotsSchema>;

/**
 * An interview in progress: where the creator is, what they have said, and the generated
 * draft once there is one.
 *
 * `revision` is the optimistic-concurrency token. It is server-authoritative: a command
 * states the revision it believed it was acting on, and a mismatch is rejected rather than
 * merged, so a retried or replayed request cannot double-advance a stage. Only the store
 * advances it: behaviour returns the next session at the same revision, and a successful save
 * bumps it.
 */
export const ActiveCreatorOnboardingSessionSchema = z.object({
  status: z.literal("in_progress"),
  sessionId: z.string().min(1).max(64),
  behaviorVersion: CreatorOnboardingBehaviorVersionSchema,
  currentStage: CreatorOnboardingStageSchema,
  slots: CreatorOnboardingSlotsSchema,
  /** The generated foundation once it exists, still editable. `null` before generation. */
  draft: CreatorProfileDraftSchema.nullable(),
  revision: z.number().int().nonnegative(),
});
export type ActiveCreatorOnboardingSession = z.infer<typeof ActiveCreatorOnboardingSessionSchema>;

/**
 * A finished interview. Deliberately *not* an active session with a flag flipped: it has no
 * `slots` and no `draft`, so the private answers cannot survive the commit that retires them.
 *
 * What it keeps is what stays useful and is already public — the profile that was published,
 * plus enough metadata to attribute the result to the behaviour that produced it.
 */
export const CompletedCreatorOnboardingSessionSchema = z.object({
  status: z.literal("completed"),
  sessionId: z.string().min(1).max(64),
  behaviorVersion: CreatorOnboardingBehaviorVersionSchema,
  completedAt: z.string().datetime(),
  /** The values actually committed to the public profile. */
  committedProfile: CommitProfileInputSchema,
  revision: z.number().int().nonnegative(),
});
export type CompletedCreatorOnboardingSession = z.infer<
  typeof CompletedCreatorOnboardingSessionSchema
>;

/** One creator's onboarding session, in either of its two shapes. */
export const CreatorOnboardingSessionSchema = z.discriminatedUnion("status", [
  ActiveCreatorOnboardingSessionSchema,
  CompletedCreatorOnboardingSessionSchema,
]);
export type CreatorOnboardingSession = z.infer<typeof CreatorOnboardingSessionSchema>;

/**
 * Every action a stage can offer.
 *
 * `revise_with_weave` is **absent by design**. The designs draw it at the foundation stage
 * (`2065:58399`) and the refinement frames behind it are captured, but that capability does
 * not exist yet and a disabled control implying it does would be dishonest. It is not a
 * member of this enum, so no provider can emit one (ADR-0022). The composer's `+` and
 * microphone affordances are absent for the same reason and are not actions at all.
 */
export const CREATOR_ONBOARDING_ACTIONS = [
  "begin",
  "later",
  "submit",
  "request_help",
  "skip",
  "choose_for_me",
  "finish",
  "create_profile_image",
  "create_cover_image",
  "refine_profile",
] as const;
export const CreatorOnboardingActionSchema = z.enum(CREATOR_ONBOARDING_ACTIONS);
export type CreatorOnboardingAction = z.infer<typeof CreatorOnboardingActionSchema>;

/**
 * Whether an offered action works yet.
 *
 * The completion rail (`1443:78273`) draws four next steps and only Finish for now is
 * implemented. Rather than hide the other three — they are real boundaries to real future
 * flows — a provider marks them `coming_soon` and the renderer disables and labels them.
 * The distinction between "not offered" (absent from the array) and "offered but not
 * available yet" is the whole point.
 */
export const CreatorOnboardingActionAvailabilitySchema = z.enum(["available", "coming_soon"]);
export type CreatorOnboardingActionAvailability = z.infer<
  typeof CreatorOnboardingActionAvailabilitySchema
>;

export const CreatorOnboardingActionModelSchema = z.object({
  id: CreatorOnboardingActionSchema,
  label: z.string().min(1).max(80),
  emphasis: z.enum(["primary", "secondary", "text"]),
  availability: CreatorOnboardingActionAvailabilitySchema,
});
export type CreatorOnboardingActionModel = z.infer<typeof CreatorOnboardingActionModelSchema>;

/** One selectable option, identified by a stable id rather than its rendered label. */
export const CreatorOnboardingChoiceSchema = z.object({
  id: z.string().min(1).max(64),
  label: z.string().min(1).max(120),
  description: z.string().min(1).max(280).optional(),
});
export type CreatorOnboardingChoice = z.infer<typeof CreatorOnboardingChoiceSchema>;

/**
 * What the stage asks the creator to supply. Four kinds cover all eleven captured stages,
 * which is why `ui` needs one renderer rather than eleven components.
 */
export const CreatorOnboardingStageInputSchema = z
  .discriminatedUnion("kind", [
    z.object({ kind: z.literal("none") }),
    z.object({
      kind: z.literal("text"),
      placeholder: z.string().min(1).max(200),
      multiline: z.boolean(),
      maxLength: z.number().int().positive().max(4000),
      required: z.boolean(),
    }),
    z.object({
      kind: z.literal("choice"),
      options: z.array(CreatorOnboardingChoiceSchema).min(1).max(10),
      /**
       * The option whose selection invites the creator's own words ("Custom direction",
       * `1556:79716`), or `null` when no option does. Named by id rather than implied by
       * position, so a provider can order its options however it likes.
       */
      customTextChoiceId: z.string().min(1).max(64).nullable(),
    }),
    z.object({ kind: z.literal("foundation"), draft: CreatorProfileDraftSchema }),
  ])
  // Checked on the union because a discriminated-union member cannot carry a refinement.
  .refine(
    (input) =>
      input.kind !== "choice" ||
      input.customTextChoiceId === null ||
      input.options.some((option) => option.id === input.customTextChoiceId),
    { message: "customTextChoiceId must name one of the options", path: ["customTextChoiceId"] },
  );
export type CreatorOnboardingStageInput = z.infer<typeof CreatorOnboardingStageInputSchema>;

/**
 * Everything needed to draw the current stage, and nothing that needs storing.
 *
 * `prompt` is Weave's prose for this moment, produced fresh on every render. It is the
 * reason the session has no transcript field: the words are a function of the structured
 * state, so they never have to be persisted to be shown again after a reload.
 */
export const StageRenderModelSchema = z.object({
  stage: CreatorOnboardingStageSchema,
  /** Assistant prose, one entry per paragraph. Derived, never stored. */
  prompt: z.array(z.string().min(1)).min(1),
  input: CreatorOnboardingStageInputSchema,
  actions: z.array(CreatorOnboardingActionModelSchema).min(1),
  progress: z.object({
    stageNumber: z.number().int().min(1).max(CREATOR_ONBOARDING_STAGE_COUNT),
    stageCount: z.literal(CREATOR_ONBOARDING_STAGE_COUNT),
  }),
});
export type StageRenderModel = z.infer<typeof StageRenderModelSchema>;

/**
 * What the creator supplied along with their action.
 *
 * Notice what is missing: no creator id, no behaviour version, no generated draft. This is
 * the one shape parsed from browser input, so anything the browser must not be able to
 * assert is structurally absent rather than validated away (compare
 * {@link CreatorOnboardingActor}).
 */
export const TransitionInputSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("text"), text: z.string().min(1).max(4000) }),
  z.object({
    kind: z.literal("choice"),
    choiceId: z.string().min(1).max(64),
    customText: z.string().min(1).max(4000).optional(),
  }),
  /** The edited foundation the creator approved, collapsed to the values to publish. */
  z.object({ kind: z.literal("foundation"), profile: CommitProfileInputSchema }),
]);
export type TransitionInput = z.infer<typeof TransitionInputSchema>;

/**
 * One attempt to advance the interview.
 *
 * `idempotencyKey` identifies the creator's *intent*, so a retried submit is recognised as
 * the same attempt rather than applied twice. `expectedRevision` pins it to the state the
 * creator was actually looking at.
 */
export const TransitionCommandSchema = z.object({
  action: CreatorOnboardingActionSchema,
  expectedRevision: z.number().int().nonnegative(),
  idempotencyKey: z.string().min(8).max(128),
  input: TransitionInputSchema.optional(),
});
export type TransitionCommand = z.infer<typeof TransitionCommandSchema>;

/** Why a transition was refused. */
export const TRANSITION_REJECTIONS = [
  /** `expectedRevision` did not match the session; the creator acted on stale state. */
  "stale_revision",
  /** A required answer was missing — a generation-gating stage, or a required text input. */
  "required_input_missing",
  /** The action is not offered at this stage. */
  "unsupported_action",
  /** The action is offered but not implemented yet (`coming_soon`). */
  "unavailable_action",
  /** Input was present but did not fit the stage — wrong kind, or an unknown choice id. */
  "invalid_input",
  /** The session is already completed and no longer accepts transitions. */
  "already_completed",
] as const;
export const TransitionRejectionSchema = z.enum(TRANSITION_REJECTIONS);
export type TransitionRejection = z.infer<typeof TransitionRejectionSchema>;

/**
 * What the creator's answers add up to, handed to whatever generates the profile.
 *
 * Structured slots in flow order — not a conversation. `answers` omits pending and skipped
 * stages, so a generator receives what was actually said and nothing standing in for what
 * was not.
 */
export const FoundationGenerationRequestSchema = z.object({
  behaviorVersion: CreatorOnboardingBehaviorVersionSchema,
  answers: z
    .array(
      z.object({
        stage: CreatorOnboardingStageSchema,
        answer: CreatorOnboardingAnswerSchema,
      }),
    )
    .min(CREATOR_ONBOARDING_GENERATION_REQUIRES.length),
});
export type FoundationGenerationRequest = z.infer<typeof FoundationGenerationRequestSchema>;

/**
 * A generated foundation, validated before it is allowed near the session.
 *
 * Reuses {@link CreatorProfileDraftSchema} deliberately: generation, editing and commit
 * share one set of field limits, so a model cannot produce something the editor accepts but
 * the commit rejects.
 */
export const FoundationGenerationResultSchema = z.object({
  draft: CreatorProfileDraftSchema,
});
export type FoundationGenerationResult = z.infer<typeof FoundationGenerationResultSchema>;

/**
 * The result of finishing onboarding.
 *
 * `alreadyCompleted` is how a caller tells a fresh commit from a replayed one without
 * guessing. Completion is idempotent: once a session is completed, every later commit —
 * whatever its idempotency key — yields the same session and reports that it changed nothing.
 */
export const CreatorOnboardingCompletionSchema = z.object({
  session: CompletedCreatorOnboardingSessionSchema,
  alreadyCompleted: z.boolean(),
});
export type CreatorOnboardingCompletion = z.infer<typeof CreatorOnboardingCompletionSchema>;

/**
 * What a transition produced. A union rather than a session plus flags, because the four
 * outcomes oblige the caller to do four genuinely different things.
 *
 * `generate` and `commit` are requests back to the caller: the behaviour decides *that*
 * generation or publication should happen and supplies the validated payload, but performs
 * neither. That is what keeps a pure stage machine on one side of the seam and model calls
 * and transactions on the other.
 */
export type TransitionResult =
  | {
      outcome: "advanced";
      session: ActiveCreatorOnboardingSession;
      render: StageRenderModel;
    }
  | { outcome: "rejected"; reason: TransitionRejection; render: StageRenderModel }
  | {
      outcome: "generate";
      session: ActiveCreatorOnboardingSession;
      request: FoundationGenerationRequest;
    }
  | {
      outcome: "commit";
      session: ActiveCreatorOnboardingSession;
      profile: CommitProfileInput;
    };

/**
 * Weave's onboarding behaviour: what to ask, and what an answer means.
 *
 * Four members, no I/O. Every method is a pure function of a session, which is what makes
 * the deterministic test adapter possible and why a later provider swap cannot reach the UI.
 *
 * Invariants an adapter must hold:
 *
 * 1. `version` matches the `behaviorVersion` of every session it produces, and it refuses a
 *    session pinned to another version rather than reinterpreting it.
 * 2. `render` is a pure function of the session: the same session renders the same model, so
 *    a reload shows the creator exactly what they left.
 * 3. `apply` never mutates its argument; it returns the next state.
 * 4. `apply` and `acceptFoundation` never change `revision`: the next session carries the
 *    revision it was derived from, and only {@link CreatorOnboardingSessionStore.save} bumps
 *    it. `apply` rejects a command whose `expectedRevision` differs from `session.revision`,
 *    and a rejection leaves the session untouched.
 * 5. Only the stages in {@link CREATOR_ONBOARDING_GENERATION_REQUIRES} gate `generate`.
 *    Every other stage may be skipped without blocking it.
 * 6. An action absent from the current render's `actions` is `unsupported_action`; one
 *    present but `coming_soon` is `unavailable_action`. Neither advances the session.
 * 7. A completed session renders the completion rail — Finish for now `available`, the
 *    image and refinement actions `coming_soon` — and `apply` rejects every action on it as
 *    `already_completed`. Finish for now is navigation the UI handles, not a transition.
 * 8. No method performs I/O, calls a model, or reads the Weave OS corpus.
 */
export type CreatorOnboardingBehavior = {
  readonly version: CreatorOnboardingBehaviorVersion;
  /** A fresh session at the opening stage, pinned to this adapter's version. */
  start(args: { sessionId: string }): ActiveCreatorOnboardingSession;
  /** What to draw for the session's current stage, or the completion rail once it is done. */
  render(session: CreatorOnboardingSession): StageRenderModel;
  /** Apply one creator action. */
  apply(session: CreatorOnboardingSession, command: TransitionCommand): TransitionResult;
  /** Fold a validated generated foundation in and move to the foundation stage. */
  acceptFoundation(
    session: ActiveCreatorOnboardingSession,
    result: FoundationGenerationResult,
  ): TransitionResult;
};

/**
 * Who is onboarding. Resolved server-side from the auth session, never parsed from a request
 * body — a separate parameter for the same reason {@link TransitionCommandSchema} has no
 * creator field: there is nothing to spoof.
 */
export type CreatorOnboardingActor = { readonly userId: string };

/** Whether a save won or lost the optimistic-concurrency race. */
export type SessionSaveResult =
  | { outcome: "saved"; session: CreatorOnboardingSession }
  /** Someone else advanced first; `session` is the authoritative current state. */
  | { outcome: "stale"; session: CreatorOnboardingSession };

/**
 * Where onboarding progress lives between requests.
 *
 * Three methods over a large implementation: one owned row per creator, JSON parsed through
 * the schemas above on every read, revision-checked writes, and a completion that publishes
 * the profile and erases the raw answers in one atomic step.
 *
 * Invariants an adapter must hold:
 *
 * 1. Every method is scoped to `actor`. A creator can neither read nor write another
 *    creator's session, and there is no argument through which to try.
 * 2. Stored state is parsed with {@link CreatorOnboardingSessionSchema} on read.
 *    Unparseable or unknown-version state is an error, never a silently repaired session.
 * 3. `save` rejects a session whose `revision` is not the stored one, returning the current
 *    state rather than overwriting it. A successful save advances `revision`, and nothing
 *    else does.
 * 4. `complete` publishes the profile, clears the raw answers and records completion
 *    atomically. Once the session is completed, any later `complete` — with the same
 *    `idempotencyKey` or a different one — returns the existing completion with
 *    `alreadyCompleted: true`, and never republishes or overwrites the stored completion.
 * 5. After `complete`, no raw answer or draft remains recoverable through this interface —
 *    guaranteed by the shape of {@link CompletedCreatorOnboardingSessionSchema}.
 */
export type CreatorOnboardingSessionStore = {
  /** The creator's session, or `null` if they have not started one. */
  load(actor: CreatorOnboardingActor): Promise<CreatorOnboardingSession | null>;
  /** Persist progress, subject to the revision check. */
  save(
    actor: CreatorOnboardingActor,
    session: CreatorOnboardingSession,
  ): Promise<SessionSaveResult>;
  /** Publish the approved profile, retire the raw answers, and finish the session. */
  complete(
    actor: CreatorOnboardingActor,
    args: { sessionId: string; profile: CommitProfileInput; idempotencyKey: string },
  ): Promise<CreatorOnboardingCompletion>;
};

export const stubCreatorOnboardingBehavior: CreatorOnboardingBehavior = {
  version: "snapshot-v1",
  start(): ActiveCreatorOnboardingSession {
    throw new NotImplementedError("CreatorOnboardingBehavior.start");
  },
  render(): StageRenderModel {
    throw new NotImplementedError("CreatorOnboardingBehavior.render");
  },
  apply(): TransitionResult {
    throw new NotImplementedError("CreatorOnboardingBehavior.apply");
  },
  acceptFoundation(): TransitionResult {
    throw new NotImplementedError("CreatorOnboardingBehavior.acceptFoundation");
  },
};

export const stubCreatorOnboardingSessionStore: CreatorOnboardingSessionStore = {
  load(): Promise<CreatorOnboardingSession | null> {
    return Promise.reject(new NotImplementedError("CreatorOnboardingSessionStore.load"));
  },
  save(): Promise<SessionSaveResult> {
    return Promise.reject(new NotImplementedError("CreatorOnboardingSessionStore.save"));
  },
  complete(): Promise<CreatorOnboardingCompletion> {
    return Promise.reject(new NotImplementedError("CreatorOnboardingSessionStore.complete"));
  },
};
