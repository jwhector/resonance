import * as React from "react";
import type {
  CreatorOnboardingAction,
  CreatorOnboardingActionModel,
  CreatorOnboardingChoice,
  CreatorOnboardingStageInput,
  StageRenderModel,
  TransitionInput,
} from "@resonance/core";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { RadioCard, RadioGroup } from "../primitives/radio";
import { TextInput } from "../primitives/text-input";
import {
  FoundationEditor,
  initialFoundationEdits,
  validateFoundation,
  type FoundationEdits,
} from "./creator-onboarding-foundation";
import { WeaveComposer } from "./weave-composer";
import { WeaveMark } from "./weave-mark";

/**
 * CreatorOnboardingStage — draws any stage of the staged creator interview from a
 * `StageRenderModel`, inside the Weave surface (opening `1473:81547` through foundation
 * `2065:58399`, and the completion rail `1443:78273`).
 *
 * One renderer instead of one component per screen is the point (ADR-0022 §2): layout is
 * decided by the model's `input.kind` and by which actions it offers, never by the stage's
 * name, so a provider that rewrote every question and option needs no change here. The one
 * exception is `completion`, which the design draws as a narrow rail of stacked next steps.
 *
 * Presentational and framework-agnostic: no data, no routing, no server calls. The creator's
 * in-progress answer is local state seeded from the model; the caller receives it only as the
 * `TransitionInput` attached to a `submit` action, and every other action carries no input.
 * An action whose id is `finish` calls `onFinish` instead of `onAction`, because Finish for now
 * is navigation rather than a transition.
 *
 * Honest absences (ADR-0022 §10): the composer's `+` and microphone are not rendered, nor are
 * the header's collapse/close controls; a `coming_soon` action is shown, labelled "Coming
 * soon", marked `aria-disabled`, and never fires. The composer only appears on stages that
 * take long-form text — elsewhere there would be nothing for it to send.
 */
export interface CreatorOnboardingStageProps {
  /** What to draw. */
  model: StageRenderModel;
  /** A transition the creator asked for; `input` accompanies `submit` only. */
  onAction: (action: CreatorOnboardingAction, input?: TransitionInput) => void;
  /** Finish for now — leave onboarding. */
  onFinish: () => void;
  /** A transition is in flight: every control is inert and the surface reports busy. */
  pending?: boolean;
  /** Why the last transition failed, shown as an alert above the actions. */
  error?: string | null;
  /** Rendered beneath the completion rail's next steps, e.g. the committed profile. */
  completionSummary?: React.ReactNode;
  className?: string;
}

/**
 * The line that asks the question is bold in every captured stage, and it is always the one
 * ending in a question mark (possibly inside a closing quote). Deriving the emphasis from the
 * prose keeps markup out of the contract's plain-string paragraphs.
 */
function isQuestion(paragraph: string): boolean {
  return /\?["'”’]?$/.test(paragraph.trim());
}

function Prompt({ paragraphs, spaced }: { paragraphs: string[]; spaced: boolean }) {
  return (
    <div
      aria-live="polite"
      className={cn("flex flex-col text-body-lg text-foreground", spaced && "gap-6")}
    >
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={cn("whitespace-pre-line", isQuestion(paragraph) && "font-bold")}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

/**
 * The actions row. Two arrangements appear in the frames and the model predicts which: beside a
 * filled primary the actions sit in a row and a secondary takes the brand outline (`1473:81553`,
 * `1556:79716`); with no primary they stack and a secondary takes the neutral outline
 * (`1473:81547`, `1443:78273`). The completion rail additionally stretches its buttons to the
 * rail's width and centres its text action.
 *
 * PROVISIONAL: button heights, paddings and the row gap are read off the screenshots (the
 * frames are inconsistent between 14px and 22px), not from the inspector.
 */
function ActionsRow({
  actions,
  rail,
  pending,
  submitReady,
  onActivate,
}: {
  actions: CreatorOnboardingActionModel[];
  rail: boolean;
  pending: boolean;
  submitReady: boolean;
  onActivate: (action: CreatorOnboardingActionModel) => void;
}) {
  const hasPrimary = actions.some((action) => action.emphasis === "primary");
  return (
    <div
      className={cn(
        "flex",
        rail
          ? "flex-col items-stretch gap-3"
          : hasPrimary
            ? "flex-wrap items-center gap-4"
            : "flex-col items-start gap-1.5",
        // The frames leave 22px above the actions row rather than the 24px between other blocks.
        !rail && "-mt-0.5",
      )}
    >
      {actions.map((action) => {
        const comingSoon = action.availability === "coming_soon";
        const blocked = pending || (action.id === "submit" && !submitReady);
        const content = (
          <>
            {action.label}
            {comingSoon && (
              <span className="rounded-sm bg-surface-muted px-1.5 text-caption font-medium text-subtle">
                Coming soon
              </span>
            )}
          </>
        );
        const shared = {
          type: "button" as const,
          "data-action": action.id,
          // Coming-soon actions stay focusable so assistive technology can discover them and
          // hear why they do nothing; `aria-disabled` rather than `disabled` keeps them in the
          // tab order while the guard below keeps them from ever firing.
          "aria-disabled": comingSoon ? true : undefined,
          disabled: comingSoon ? undefined : blocked,
          onClick: () => {
            if (comingSoon || blocked) return;
            onActivate(action);
          },
        };
        const inert = comingSoon && "cursor-not-allowed opacity-60 hover:bg-transparent";

        if (action.emphasis === "text") {
          return (
            <button
              key={action.id}
              {...shared}
              className={cn(
                "inline-flex items-center gap-2 rounded-sm text-body-lg font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50",
                // The rail draws its text action centred and in the muted grey (`1443:78273`).
                rail
                  ? "mt-3 justify-center self-center text-muted hover:text-foreground"
                  : "text-primary hover:underline",
                inert,
              )}
            >
              {content}
            </button>
          );
        }

        if (action.emphasis === "primary") {
          return (
            <Button
              key={action.id}
              {...shared}
              className={cn("h-13 px-6 text-body-lg font-medium", rail && "w-full", inert)}
            >
              {content}
            </Button>
          );
        }

        return (
          <Button
            key={action.id}
            variant="outline"
            {...shared}
            className={cn(
              "h-14 border-2 px-6 text-body-lg font-medium",
              hasPrimary && !rail
                ? "border-primary text-primary hover:bg-primary-subtle"
                : "border-border text-foreground",
              rail && "w-full",
              inert,
            )}
          >
            {content}
          </Button>
        );
      })}
    </div>
  );
}

/**
 * Expression-style choices (`1556:79716`): stacked 500px outlined options, single-select with
 * radio-group semantics. Choosing the option the model names as `customTextChoiceId` ("Custom
 * direction" in the design) reveals a field for the creator's own words.
 */
function ChoiceInput({
  options,
  customTextChoiceId,
  choiceId,
  customText,
  onChoice,
  onCustomText,
  disabled,
  labelledBy,
}: {
  options: CreatorOnboardingChoice[];
  customTextChoiceId: string | null;
  choiceId: string | undefined;
  customText: string;
  onChoice: (id: string) => void;
  onCustomText: (text: string) => void;
  disabled: boolean;
  labelledBy: string;
}) {
  const customOption = options.find((option) => option.id === customTextChoiceId);
  const descriptionPrefix = React.useId();
  return (
    <div className="flex max-w-125 flex-col gap-4">
      <RadioGroup
        aria-labelledby={labelledBy}
        value={choiceId ?? ""}
        onValueChange={onChoice}
        disabled={disabled}
        className="gap-4"
      >
        {options.map((option, index) => {
          // The frame draws no option descriptions, so a provider's description is announced
          // with the option rather than shown.
          const descriptionId = option.description ? `${descriptionPrefix}-${index}` : undefined;
          return (
            <RadioCard key={option.id} value={option.id} aria-describedby={descriptionId}>
              {option.label}
              {descriptionId && (
                <span id={descriptionId} className="sr-only">
                  {option.description}
                </span>
              )}
            </RadioCard>
          );
        })}
      </RadioGroup>
      {customOption && choiceId === customOption.id && (
        <TextInput
          aria-label={customOption.label}
          // PROVISIONAL copy: no frame shows the custom direction being typed.
          placeholder="In your own words"
          value={customText}
          onChange={(event) => onCustomText(event.target.value)}
          maxLength={4000}
          disabled={disabled}
          className="h-14 px-4 text-body-lg"
        />
      )}
    </div>
  );
}

type Answer = { input?: TransitionInput; ready: boolean };

/**
 * Everything that depends on one stage's model. Keyed by the model's input in the parent so a
 * new question starts from a clean answer, while a re-render of the same stage (a rejected
 * transition, say) keeps what the creator had typed.
 */
function StageBody({
  model,
  onAction,
  onFinish,
  pending,
  error,
  completionSummary,
}: Omit<CreatorOnboardingStageProps, "className">) {
  const input: CreatorOnboardingStageInput = model.input;
  const rail = model.stage === "completion";
  const busy = pending ?? false;
  const promptId = React.useId();

  const [text, setText] = React.useState("");
  const [choiceId, setChoiceId] = React.useState<string | undefined>(undefined);
  const [customText, setCustomText] = React.useState("");
  const [edits, setEdits] = React.useState<FoundationEdits | null>(() =>
    input.kind === "foundation" ? initialFoundationEdits(input.draft) : null,
  );

  const foundation =
    input.kind === "foundation" && edits ? validateFoundation(input.draft, edits) : undefined;

  const answer = ((): Answer => {
    switch (input.kind) {
      case "none":
        return { ready: true };
      case "text": {
        const trimmed = text.trim();
        if (trimmed.length === 0) return { ready: !input.required };
        return { input: { kind: "text", text: trimmed }, ready: true };
      }
      case "choice": {
        if (!choiceId) return { ready: false };
        const trimmed = customText.trim();
        const isCustom = choiceId === input.customTextChoiceId;
        return {
          input: {
            kind: "choice",
            choiceId,
            ...(isCustom && trimmed.length > 0 ? { customText: trimmed } : {}),
          },
          ready: true,
        };
      }
      case "foundation":
        return foundation?.profile
          ? { input: { kind: "foundation", profile: foundation.profile }, ready: true }
          : { ready: false };
    }
  })();

  const submitAction = model.actions.find(
    (action) => action.id === "submit" && action.availability === "available",
  );
  const canSubmit = Boolean(submitAction) && answer.ready && !busy;

  function submit() {
    if (canSubmit) onAction("submit", answer.input);
  }

  function activate(action: CreatorOnboardingActionModel) {
    if (action.id === "finish") onFinish();
    else if (action.id === "submit") submit();
    else onAction(action.id);
  }

  const longForm = input.kind === "text" && input.multiline;

  return (
    <>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-10 pb-8",
          rail ? "pt-6" : "pt-10",
        )}
      >
        {/* The frames draw no progress indicator, so progress is announced, not shown. */}
        <p className="sr-only">
          Step {model.progress.stageNumber} of {model.progress.stageCount}
        </p>

        <div id={promptId}>
          <Prompt paragraphs={model.prompt} spaced={rail} />
        </div>

        {input.kind === "text" && !input.multiline && (
          // A short single-line answer is asked inline, under the question (`1473:81553`).
          <form
            className="max-w-125"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <TextInput
              aria-labelledby={promptId}
              placeholder={input.placeholder}
              maxLength={input.maxLength}
              required={input.required}
              aria-required={input.required}
              value={text}
              onChange={(event) => setText(event.target.value)}
              disabled={busy}
              className="h-14 px-4 text-body-lg placeholder:text-muted"
            />
          </form>
        )}

        {input.kind === "choice" && (
          <ChoiceInput
            options={input.options}
            customTextChoiceId={input.customTextChoiceId}
            choiceId={choiceId}
            customText={customText}
            onChoice={setChoiceId}
            onCustomText={setCustomText}
            disabled={busy}
            labelledBy={promptId}
          />
        )}

        {input.kind === "foundation" && edits && (
          <FoundationEditor
            draft={input.draft}
            edits={edits}
            onChange={setEdits}
            errors={foundation?.errors ?? {}}
            disabled={busy}
          />
        )}

        {error && (
          <p role="alert" className="text-body-md text-danger">
            {error}
          </p>
        )}

        <ActionsRow
          actions={model.actions}
          rail={rail}
          pending={busy}
          submitReady={answer.ready}
          onActivate={activate}
        />

        {rail && completionSummary}
      </div>

      {longForm && (
        // Long-form answers are typed into the bottom composer, as every open-question frame
        // draws it (`1473:81556`). Its `+` and microphone are omitted: neither capability exists.
        <div className="px-10 pb-10 pt-2">
          <WeaveComposer
            value={text}
            onValueChange={setText}
            onSend={() => submit()}
            placeholder={input.placeholder}
            aria-label={input.placeholder}
            maxLength={input.maxLength}
            multiline
            showDeferredAffordances={false}
            disabled={busy || !submitAction}
          />
        </div>
      )}
    </>
  );
}

export function CreatorOnboardingStage({ className, ...props }: CreatorOnboardingStageProps) {
  const titleId = React.useId();
  const rail = props.model.stage === "completion";
  return (
    <section
      aria-labelledby={titleId}
      aria-busy={props.pending || undefined}
      data-stage={props.model.stage}
      className={cn("flex h-full min-h-0 flex-col overflow-hidden bg-surface", className)}
    >
      {/* PROVISIONAL: header height and inset are read off the screenshots (63px with a 40px
          inset in the interview, 76px with a 24px inset in the rail, both including the
          `#cdcdcd` divider). */}
      <header
        className={cn(
          "flex shrink-0 items-center gap-3 border-b border-border",
          rail ? "h-19 px-6" : "h-15.75 px-10",
        )}
      >
        <WeaveMark />
        <span id={titleId} className="text-heading-md font-medium text-foreground">
          Weave
        </span>
      </header>
      <StageBody key={`${props.model.stage}:${JSON.stringify(props.model.input)}`} {...props} />
    </section>
  );
}
CreatorOnboardingStage.displayName = "CreatorOnboardingStage";
