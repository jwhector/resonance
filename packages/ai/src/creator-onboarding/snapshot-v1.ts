import {
  CREATOR_ONBOARDING_GENERATION_REQUIRES,
  CREATOR_ONBOARDING_STAGE_COUNT,
  CREATOR_ONBOARDING_STAGES,
  type ActiveCreatorOnboardingSession,
  type CreatorOnboardingActionModel,
  type CreatorOnboardingAnswer,
  type CreatorOnboardingBehavior,
  type CreatorOnboardingSession,
  type CreatorOnboardingSlot,
  type CreatorOnboardingSlots,
  type CreatorOnboardingStage,
  type FoundationGenerationRequest,
  type StageRenderModel,
  type TransitionCommand,
  type TransitionInput,
  type TransitionRejection,
  type TransitionResult,
} from "@resonance/core";
import { CreatorOnboardingStateError, UnsupportedBehaviorVersionError } from "../errors";
import {
  BEGIN,
  CHOOSE_FOR_ME,
  COMPLETION_ACTIONS,
  COMPLETION_PROMPT,
  COMPOSER_PLACEHOLDER,
  CREATOR_NAME_PLACEHOLDER,
  CREATOR_NAME_PROMPT,
  CUSTOM_DIRECTION_CHOICE_ID,
  EXPRESSION_STYLE_OPTIONS,
  EXPRESSION_STYLE_PROMPT,
  FOUNDATION_PROMPT,
  GOOD_TO_GO,
  INTENDED_EXPERIENCE_PROMPT,
  LATER,
  NAME_HELP_WANTED_CHOICE_ID,
  OFFERING_PROMPT,
  OPENING_PROMPT,
  ORIGIN_PROMPT,
  READY,
  REQUEST_HELP,
  RESONANCE_MOMENT_PROMPT,
  RESONANT_PEOPLE_PROMPT,
  SKIP,
  SUMMARY_CLOSING,
  SUMMARY_OPENING,
  WEAVE_CHOOSES_CHOICE_ID,
} from "./snapshot-v1.copy";

/**
 * `snapshot-v1` — the hand-modelled creator interview transcribed from the captured design
 * states, behind the {@link CreatorOnboardingBehavior} seam (ADR-0022).
 *
 * A pure stage machine: no I/O, no model call, no corpus read. It decides what the creator is
 * asked and what each action means, and hands generation and publication back to its caller
 * as `generate` and `commit` outcomes.
 *
 * Rules worth knowing before changing a stage:
 *
 * - Only the offering and intended experience are required, so those two stages offer no Skip
 *   and refuse an empty submit. Every other answer stage can be skipped.
 * - "I want to do it later" on the opening keeps the creator at the opening and marks it
 *   deferred, so they come back to the same invitation rather than to a question they never
 *   agreed to start.
 * - The summary is where generation is requested: both its Yes I'm ready and its Skip return
 *   `generate`, carrying the answered slots in flow order.
 * - Actions that carry no answer (Skip, Choose for me, begin, later) refuse an input, so a
 *   typed answer is never silently discarded by pressing the wrong control.
 */

const VERSION = "snapshot-v1" as const;

/** Stages whose answer is free text typed into the composer or the name field. */
type TextStage =
  | "creator_name"
  | "offering"
  | "origin"
  | "intended_experience"
  | "resonance_moment"
  | "resonant_people";

type TextStageSpec = {
  prompt: readonly string[];
  placeholder: string;
  multiline: boolean;
  maxLength: number;
  actions: readonly CreatorOnboardingActionModel[];
};

/** The public display-name limit, so a typed name can always become the committed one. */
const NAME_MAX_LENGTH = 120;
const ANSWER_MAX_LENGTH = 4000;

const isRequired = (stage: CreatorOnboardingStage): boolean =>
  (CREATOR_ONBOARDING_GENERATION_REQUIRES as readonly CreatorOnboardingStage[]).includes(stage);

/**
 * The designs draw Skip on every text stage, including the two required ones. Skipping a
 * required stage would only strand the creator at the summary with generation blocked and no
 * way back, so the required stages leave Skip out and ask for an answer instead.
 */
const answerActions = (stage: CreatorOnboardingStage) =>
  isRequired(stage) ? [READY] : [READY, SKIP];

const TEXT_STAGES: Record<TextStage, TextStageSpec> = {
  creator_name: {
    prompt: CREATOR_NAME_PROMPT,
    placeholder: CREATOR_NAME_PLACEHOLDER,
    multiline: false,
    maxLength: NAME_MAX_LENGTH,
    actions: [GOOD_TO_GO, REQUEST_HELP, SKIP],
  },
  offering: longAnswer(OFFERING_PROMPT, "offering"),
  origin: longAnswer(ORIGIN_PROMPT, "origin"),
  intended_experience: longAnswer(INTENDED_EXPERIENCE_PROMPT, "intended_experience"),
  resonance_moment: longAnswer(RESONANCE_MOMENT_PROMPT, "resonance_moment"),
  resonant_people: longAnswer(RESONANT_PEOPLE_PROMPT, "resonant_people"),
};

function longAnswer(prompt: readonly string[], stage: TextStage): TextStageSpec {
  return {
    prompt,
    placeholder: COMPOSER_PLACEHOLDER,
    multiline: true,
    maxLength: ANSWER_MAX_LENGTH,
    actions: answerActions(stage),
  };
}

const isTextStage = (stage: CreatorOnboardingStage): stage is TextStage => stage in TEXT_STAGES;

const indexOf = (stage: CreatorOnboardingStage) => CREATOR_ONBOARDING_STAGES.indexOf(stage);

function nextStage(stage: CreatorOnboardingStage): CreatorOnboardingStage {
  const next = CREATOR_ONBOARDING_STAGES[indexOf(stage) + 1];
  if (!next) throw new CreatorOnboardingStateError(`No stage follows "${stage}".`);
  return next;
}

function assertVersion(session: CreatorOnboardingSession): void {
  if (session.behaviorVersion !== VERSION) {
    throw new UnsupportedBehaviorVersionError(VERSION, session.behaviorVersion);
  }
}

function progress(stage: CreatorOnboardingStage): StageRenderModel["progress"] {
  return { stageNumber: indexOf(stage) + 1, stageCount: CREATOR_ONBOARDING_STAGE_COUNT };
}

/** A trimmed, non-empty string, or `null` when nothing meaningful was supplied. */
function meaningful(text: string | undefined): string | null {
  const trimmed = text?.trim();
  return trimmed ? trimmed : null;
}

/** The answered slots in flow order — exactly what a generator is allowed to see. */
function answeredInFlowOrder(
  slots: CreatorOnboardingSlots,
): FoundationGenerationRequest["answers"] {
  return CREATOR_ONBOARDING_STAGES.flatMap((stage) => {
    const slot = slots[stage];
    return slot?.status === "answered" ? [{ stage, answer: slot.answer }] : [];
  });
}

const missingRequired = (slots: CreatorOnboardingSlots) =>
  CREATOR_ONBOARDING_GENERATION_REQUIRES.some((stage) => slots[stage]?.status !== "answered");

/**
 * The summary's reflection, rebuilt from structured slots on every render so it never has to be
 * stored. The design's reflection is a paraphrase; without a model call the honest equivalent is
 * to reflect the creator's own words for the few slots that define the profile.
 */
function reflect(slots: CreatorOnboardingSlots): string[] {
  const lines: string[] = [];
  const text = (stage: CreatorOnboardingStage): string | null => {
    const slot = slots[stage];
    return slot?.status === "answered" && slot.answer.kind === "text"
      ? meaningful(slot.answer.text)
      : null;
  };
  const choice = (stage: CreatorOnboardingStage) => {
    const slot = slots[stage];
    return slot?.status === "answered" && slot.answer.kind === "choice" ? slot.answer : null;
  };

  const name = text("creator_name");
  const nameHelp = choice("creator_name");
  if (name) {
    lines.push(`You’re shaping ${name}.`);
  } else if (nameHelp?.choiceId === NAME_HELP_WANTED_CHOICE_ID) {
    const provisional = meaningful(nameHelp.customText);
    lines.push(
      provisional
        ? `You’re still exploring a name — ${provisional} is a starting point.`
        : "You’d like help finding a name.",
    );
  }

  const offering = text("offering");
  if (offering) lines.push(`You want to share: ${offering}`);

  const intended = text("intended_experience");
  if (intended) lines.push(`You hope people experience: ${intended}`);

  const style = choice("expression_style");
  if (style?.choiceId === WEAVE_CHOOSES_CHOICE_ID) {
    lines.push("You’d like me to choose the expression style.");
  } else if (style?.choiceId === CUSTOM_DIRECTION_CHOICE_ID) {
    const direction = meaningful(style.customText);
    if (direction) lines.push(`The direction you described: ${direction}`);
  } else if (style) {
    const option = EXPRESSION_STYLE_OPTIONS.find((o) => o.id === style.choiceId);
    if (option) lines.push(`The feeling you’re leaning toward: ${option.label}.`);
  }

  return lines;
}

function completionRender(): StageRenderModel {
  return {
    stage: "completion",
    prompt: [...COMPLETION_PROMPT],
    input: { kind: "none" },
    actions: [...COMPLETION_ACTIONS],
    progress: progress("completion"),
  };
}

function render(session: CreatorOnboardingSession): StageRenderModel {
  assertVersion(session);
  if (session.status === "completed") return completionRender();

  const stage = session.currentStage;

  if (isTextStage(stage)) {
    const spec = TEXT_STAGES[stage];
    return {
      stage,
      prompt: [...spec.prompt],
      input: {
        kind: "text",
        placeholder: spec.placeholder,
        multiline: spec.multiline,
        maxLength: spec.maxLength,
        required: isRequired(stage),
      },
      actions: [...spec.actions],
      progress: progress(stage),
    };
  }

  switch (stage) {
    case "opening":
      return {
        stage,
        prompt: [...OPENING_PROMPT],
        input: { kind: "none" },
        actions: [BEGIN, LATER],
        progress: progress(stage),
      };
    case "expression_style":
      return {
        stage,
        prompt: [...EXPRESSION_STYLE_PROMPT],
        input: {
          kind: "choice",
          options: EXPRESSION_STYLE_OPTIONS.map((option) => ({ ...option })),
          customTextChoiceId: CUSTOM_DIRECTION_CHOICE_ID,
        },
        actions: [GOOD_TO_GO, CHOOSE_FOR_ME, SKIP],
        progress: progress(stage),
      };
    case "summary":
      return {
        stage,
        prompt: [...SUMMARY_OPENING, ...reflect(session.slots), ...SUMMARY_CLOSING],
        input: {
          kind: "text",
          placeholder: COMPOSER_PLACEHOLDER,
          multiline: true,
          maxLength: ANSWER_MAX_LENGTH,
          required: false,
        },
        actions: [READY, SKIP],
        progress: progress(stage),
      };
    case "foundation":
      if (!session.draft) {
        throw new CreatorOnboardingStateError(
          "An onboarding session reached the foundation stage without a generated draft.",
        );
      }
      return {
        stage,
        prompt: [...FOUNDATION_PROMPT],
        input: { kind: "foundation", draft: session.draft },
        actions: [GOOD_TO_GO],
        progress: progress(stage),
      };
    case "completion":
      return completionRender();
  }
}

type Rejecter = (reason: TransitionRejection) => TransitionResult;

function advanced(session: ActiveCreatorOnboardingSession): TransitionResult {
  return { outcome: "advanced", session, render: render(session) };
}

/** Record a slot on the current stage and move to the next one. */
function recordAndAdvance(
  session: ActiveCreatorOnboardingSession,
  slot: CreatorOnboardingSlot,
): TransitionResult {
  return advanced({
    ...session,
    slots: { ...session.slots, [session.currentStage]: slot },
    currentStage: nextStage(session.currentStage),
  });
}

const answered = (answer: CreatorOnboardingAnswer): CreatorOnboardingSlot => ({
  status: "answered",
  answer,
});

/**
 * Read a free-text answer off a command. Whitespace counts as nothing, and an over-long answer
 * is refused rather than truncated, because a clipped answer would misrepresent what was said.
 */
function readText(
  input: TransitionInput | undefined,
  spec: { maxLength: number; required: boolean },
): { text: string } | { reason: TransitionRejection } | { text: null } {
  if (input && input.kind !== "text") return { reason: "invalid_input" };
  const text = meaningful(input?.text);
  if (text === null) {
    return spec.required ? { reason: "required_input_missing" } : { text: null };
  }
  if (text.length > spec.maxLength) return { reason: "invalid_input" };
  return { text };
}

function applyTextStage(
  session: ActiveCreatorOnboardingSession,
  stage: TextStage,
  command: TransitionCommand,
  reject: Rejecter,
): TransitionResult {
  const spec = TEXT_STAGES[stage];
  const required = isRequired(stage);

  if (command.action === "skip") {
    return command.input
      ? reject("invalid_input")
      : recordAndAdvance(session, { status: "skipped" });
  }

  if (command.action === "request_help") {
    const read = readText(command.input, { maxLength: spec.maxLength, required: false });
    if ("reason" in read) return reject(read.reason);
    return recordAndAdvance(
      session,
      answered({
        kind: "choice",
        choiceId: NAME_HELP_WANTED_CHOICE_ID,
        ...(read.text ? { customText: read.text } : {}),
      }),
    );
  }

  // Submit. An optional stage submitted with nothing typed means "nothing to add", which is the
  // same as Skip, matching the summary.
  const read = readText(command.input, { maxLength: spec.maxLength, required });
  if ("reason" in read) return reject(read.reason);
  return recordAndAdvance(
    session,
    read.text === null ? { status: "skipped" } : answered({ kind: "text", text: read.text }),
  );
}

function applyExpressionStyle(
  session: ActiveCreatorOnboardingSession,
  command: TransitionCommand,
  reject: Rejecter,
): TransitionResult {
  if (command.action === "skip" || command.action === "choose_for_me") {
    if (command.input) return reject("invalid_input");
    return command.action === "skip"
      ? recordAndAdvance(session, { status: "skipped" })
      : recordAndAdvance(session, answered({ kind: "choice", choiceId: WEAVE_CHOOSES_CHOICE_ID }));
  }

  const input = command.input;
  if (input?.kind !== "choice") return reject("invalid_input");
  if (!EXPRESSION_STYLE_OPTIONS.some((option) => option.id === input.choiceId)) {
    return reject("invalid_input");
  }
  const customText = meaningful(input.customText);
  if (customText && customText.length > ANSWER_MAX_LENGTH) return reject("invalid_input");
  // Custom direction is the one option that means nothing without its text. On the others,
  // text is kept as extra nuance: the render contract offers custom text for the stage, not per
  // option, so a renderer cannot know to withhold it.
  if (input.choiceId === CUSTOM_DIRECTION_CHOICE_ID && !customText) {
    return reject("required_input_missing");
  }
  return recordAndAdvance(
    session,
    answered({
      kind: "choice",
      choiceId: input.choiceId,
      ...(customText ? { customText } : {}),
    }),
  );
}

function applySummary(
  session: ActiveCreatorOnboardingSession,
  command: TransitionCommand,
  reject: Rejecter,
): TransitionResult {
  let slot: CreatorOnboardingSlot;
  if (command.action === "skip") {
    if (command.input) return reject("invalid_input");
    slot = { status: "skipped" };
  } else {
    // Yes I'm ready with nothing typed means "nothing to add", which is the same as Skip.
    const read = readText(command.input, { maxLength: ANSWER_MAX_LENGTH, required: false });
    if ("reason" in read) return reject(read.reason);
    slot = read.text === null ? { status: "skipped" } : answered({ kind: "text", text: read.text });
  }

  const slots = { ...session.slots, summary: slot };
  if (missingRequired(slots)) return reject("required_input_missing");

  return {
    outcome: "generate",
    session: { ...session, slots },
    request: { behaviorVersion: session.behaviorVersion, answers: answeredInFlowOrder(slots) },
  };
}

function apply(session: CreatorOnboardingSession, command: TransitionCommand): TransitionResult {
  assertVersion(session);
  const current = render(session);
  const reject: Rejecter = (reason) => ({ outcome: "rejected", reason, render: current });

  if (session.status === "completed") return reject("already_completed");
  if (command.expectedRevision !== session.revision) return reject("stale_revision");

  const offered = current.actions.find((action) => action.id === command.action);
  if (!offered) return reject("unsupported_action");
  if (offered.availability === "coming_soon") return reject("unavailable_action");

  const stage = session.currentStage;
  if (isTextStage(stage)) return applyTextStage(session, stage, command, reject);

  switch (stage) {
    case "opening": {
      if (command.input) return reject("invalid_input");
      if (command.action === "later") {
        return advanced({
          ...session,
          slots: { ...session.slots, opening: { status: "skipped" } },
        });
      }
      // Beginning retires an earlier deferral: the creator is no longer declining.
      const slots = Object.fromEntries(
        Object.entries(session.slots).filter(([key]) => key !== "opening"),
      ) as CreatorOnboardingSlots;
      return advanced({ ...session, slots, currentStage: nextStage(stage) });
    }
    case "expression_style":
      return applyExpressionStyle(session, command, reject);
    case "summary":
      return applySummary(session, command, reject);
    case "foundation":
      return command.input?.kind === "foundation"
        ? { outcome: "commit", session, profile: command.input.profile }
        : reject("invalid_input");
    case "completion":
      // Only reachable by an in-progress session parked on the rail. Finish for now is
      // navigation the UI performs, so there is no transition for it to request.
      return reject("unsupported_action");
  }
}

export const snapshotV1CreatorOnboardingBehavior: CreatorOnboardingBehavior = {
  version: VERSION,

  start: ({ sessionId }) => ({
    status: "in_progress",
    sessionId,
    behaviorVersion: VERSION,
    currentStage: "opening",
    slots: {},
    draft: null,
    revision: 0,
  }),

  render,

  apply,

  acceptFoundation(session, result) {
    assertVersion(session);
    const current = render(session);
    const reject: Rejecter = (reason) => ({ outcome: "rejected", reason, render: current });

    // The type says active, but this is called with state loaded from storage; a completed
    // session must not be reopened by a late generation result.
    if ((session as CreatorOnboardingSession).status === "completed") {
      return reject("already_completed");
    }
    if (session.currentStage !== "summary") {
      return reject("unsupported_action");
    }
    if (missingRequired(session.slots)) return reject("required_input_missing");

    return advanced({ ...session, currentStage: "foundation", draft: result.draft });
  },
};
