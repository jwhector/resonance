import * as React from "react";
import type { CreatorProfileDraft } from "@resonance/core";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Radio, RadioGroup } from "../primitives/radio";
import { Tag, TagGroup } from "../primitives/tag";
import { Textarea } from "../primitives/textarea";
import { TextInput } from "../primitives/text-input";

/**
 * ProfileDraftPanels — the editable generated-profile draft (Figma
 * `Onboarding/Creator/Interview/Generated` `1473:81622`, ADR-0012 / ADR-0013).
 *
 * A **controlled** editor over the shared `CreatorProfileDraft` contract from
 * `@resonance/core`: the parent (apps/web) owns the draft and the selected name, and this
 * component renders + emits edits via callbacks. It does no generation and never touches
 * `@resonance/ai` (server-only). Sections render in the Figma order: intro → Creator Name
 * (radio of ≤3 options) → Headline → About → Search Keywords (removable chips) → the footer
 * buttons. The live "Talk to Weave" composer belongs to the Weave surface shell that hosts
 * these panels, not here. Composed from `Radio`/`RadioGroup`, `TextInput`, `Textarea`,
 * `Tag`/`TagGroup`, and `Button`; tokens only.
 */
export interface ProfileDraftPanelsProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onSubmit"
> {
  /** The generated draft being edited. The parent owns and updates it. */
  draft: CreatorProfileDraft;
  /** Index into `draft.nameOptions` of the chosen creator name. */
  selectedNameIndex: number;
  /** Fires with the newly chosen name option's index. */
  onSelectName: (index: number) => void;
  /** Fires with the edited headline text. */
  onHeadlineChange: (value: string) => void;
  /** Fires with the edited bio/about text. */
  onBioChange: (value: string) => void;
  /** Fires with the next tag set (e.g. after a chip is removed). */
  onTagsChange: (tags: string[]) => void;
  /** Fires when the primary "Good to go" action is taken (commit the profile). */
  onSubmit: () => void;
  /** True while the commit is in flight — disables the primary button and shows progress. */
  submitting?: boolean;
}

/** Section heading shared by every panel (Figma Heading/L — 28px Bold). */
function SectionHeading({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="text-heading-lg font-bold text-foreground">
      {children}
    </h2>
  );
}

export function ProfileDraftPanels({
  className,
  draft,
  selectedNameIndex,
  onSelectName,
  onHeadlineChange,
  onBioChange,
  onTagsChange,
  onSubmit,
  submitting = false,
  ...props
}: ProfileDraftPanelsProps) {
  const headlineId = React.useId();
  const aboutId = React.useId();
  const nameGroupLabelId = React.useId();

  return (
    <div className={cn("flex w-full flex-col gap-6", className)} {...props}>
      {/* Intro copy — verbatim from the design (Body/L). */}
      <div className="flex flex-col text-body-lg text-foreground">
        <p>Here are a few creator directions based on everything you shared.</p>
        <p>
          Nothing here needs to be final — this is simply a first version you can refine and grow
          over time.
        </p>
      </div>

      {/* Creator Name — pick one of the (≤3) generated options. */}
      <section className="flex flex-col gap-6">
        <SectionHeading id={nameGroupLabelId}>Creator Name</SectionHeading>
        <RadioGroup
          aria-labelledby={nameGroupLabelId}
          value={String(selectedNameIndex)}
          onValueChange={(value) => onSelectName(Number(value))}
          className="gap-6"
        >
          {draft.nameOptions.map((option, index) => {
            const active = index === selectedNameIndex;
            return (
              <Radio
                key={index}
                value={String(index)}
                label={
                  <span className="flex flex-col gap-2">
                    <span
                      className={cn(
                        "text-heading-md font-medium",
                        active ? "text-foreground" : "text-muted",
                      )}
                    >
                      {option.name}
                    </span>
                    <span className={cn("text-body-lg", active ? "text-foreground" : "text-muted")}>
                      {option.description}
                    </span>
                  </span>
                }
              />
            );
          })}
        </RadioGroup>
      </section>

      {/* Headline. */}
      <section className="flex flex-col gap-6">
        <SectionHeading id={headlineId}>Headline</SectionHeading>
        <TextInput
          aria-labelledby={headlineId}
          value={draft.headline}
          onChange={(event) => onHeadlineChange(event.target.value)}
          className="h-14 px-4 text-body-lg"
        />
      </section>

      {/* About / bio. */}
      <section className="flex flex-col gap-6">
        <SectionHeading id={aboutId}>About</SectionHeading>
        <Textarea
          aria-labelledby={aboutId}
          rows={5}
          value={draft.bio}
          onChange={(event) => onBioChange(event.target.value)}
          className="p-4 text-body-lg"
        />
      </section>

      {/* Search Keywords — removable chips. */}
      <section className="flex flex-col gap-5">
        <SectionHeading>Search Keywords</SectionHeading>
        <TagGroup aria-label="Search keywords" className="gap-4">
          {draft.tags.map((tag, index) => (
            <Tag
              key={`${tag}-${index}`}
              onRemove={() => onTagsChange(draft.tags.filter((_, i) => i !== index))}
            >
              {tag}
            </Tag>
          ))}
        </TagGroup>
      </section>

      {/* Footer actions. "Good to go" commits; "Revise with Weave" is the deferred loop. The
          live "Talk to Weave" composer sits below, on the Weave surface shell (not here). */}
      <div className="flex items-center gap-4">
        <Button type="button" size="lg" onClick={onSubmit} disabled={submitting} className="px-6">
          {submitting ? "Saving…" : "Good to go"}
        </Button>
        <Button type="button" variant="ghost" disabled className="text-primary">
          Revise with Weave
        </Button>
      </div>
    </div>
  );
}
ProfileDraftPanels.displayName = "ProfileDraftPanels";
