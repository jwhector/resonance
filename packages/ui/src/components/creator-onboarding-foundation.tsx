import * as React from "react";
import {
  CommitProfileInputSchema,
  type CommitProfileInput,
  type CreatorProfileDraft,
} from "@resonance/core";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Radio, RadioGroup } from "../primitives/radio";
import { Tag, TagGroup } from "../primitives/tag";
import { Textarea } from "../primitives/textarea";
import { TextInput } from "../primitives/text-input";

/**
 * The inline, directly-editable profile foundation (Figma `2065:58399`, manifest screen
 * `23-creator-profile-foundation`). Internal to the staged onboarding renderer.
 *
 * Controlled: the renderer owns the {@link FoundationEdits} and validates them, so the same
 * validation result decides both the field errors shown here and whether the primary action
 * is enabled. The draft only seeds the edits and supplies the name candidates' rationales.
 *
 * Deliberately no "Revise with Weave": field-by-field refinement does not exist yet, and a
 * control implying it would be a dead end (ADR-0022).
 */

/** What the creator has picked and typed, before it is collapsed into a commit payload. */
export interface FoundationEdits {
  selectedNameIndex: number;
  headline: string;
  bio: string;
  tags: string[];
}

export type FoundationField = keyof CommitProfileInput;
export type FoundationErrors = Partial<Record<FoundationField, string>>;

/** The schema's field limits, restated as sentences a creator can act on. */
const FIELD_MESSAGES: Record<FoundationField, string> = {
  displayName: "Choose a creator name.",
  headline: "Add a headline of up to 200 characters.",
  bio: "Add an About section of up to 5,000 characters.",
  tags: "Keep to 20 search keywords or fewer.",
};

/** The limit `CommitProfileInputSchema` places on keywords; Add tag stops offering beyond it. */
const MAX_TAGS = 20;

export function initialFoundationEdits(draft: CreatorProfileDraft): FoundationEdits {
  return { selectedNameIndex: 0, headline: draft.headline, bio: draft.bio, tags: draft.tags };
}

/**
 * Collapse the edits into the payload to publish, validated with the same schema the commit
 * uses — so the button is only enabled for something the server will accept.
 */
export function validateFoundation(
  draft: CreatorProfileDraft,
  edits: FoundationEdits,
):
  | { profile: CommitProfileInput; errors?: undefined }
  | { profile?: undefined; errors: FoundationErrors } {
  const parsed = CommitProfileInputSchema.safeParse({
    displayName: draft.nameOptions[edits.selectedNameIndex]?.name,
    headline: edits.headline,
    bio: edits.bio,
    tags: edits.tags,
  });
  if (parsed.success) return { profile: parsed.data };
  const errors: FoundationErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as FoundationField;
    errors[field] = FIELD_MESSAGES[field];
  }
  return { errors };
}

/** Section heading shared by every foundation block (28px bold in the frame). */
function SectionHeading({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="text-heading-lg font-bold text-foreground">
      {children}
    </h3>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-body-md text-danger">
      {message}
    </p>
  );
}

export interface FoundationEditorProps {
  draft: CreatorProfileDraft;
  edits: FoundationEdits;
  onChange: (edits: FoundationEdits) => void;
  errors: FoundationErrors;
  disabled?: boolean;
}

export function FoundationEditor({
  draft,
  edits,
  onChange,
  errors,
  disabled = false,
}: FoundationEditorProps) {
  const ids = {
    name: React.useId(),
    nameError: React.useId(),
    headline: React.useId(),
    headlineError: React.useId(),
    about: React.useId(),
    aboutError: React.useId(),
    keywords: React.useId(),
    keywordsError: React.useId(),
  };
  const [newTag, setNewTag] = React.useState("");

  const trimmedTag = newTag.trim();
  const canAddTag = !disabled && trimmedTag.length > 0 && edits.tags.length < MAX_TAGS;

  function addTag() {
    if (!canAddTag) return;
    // A keyword already present (in any casing) is not added twice; the field still clears
    // so the creator can see the entry was taken into account.
    const exists = edits.tags.some((tag) => tag.toLowerCase() === trimmedTag.toLowerCase());
    if (!exists) onChange({ ...edits, tags: [...edits.tags, trimmedTag] });
    setNewTag("");
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-6">
        <SectionHeading id={ids.name}>Creator Name</SectionHeading>
        <RadioGroup
          aria-labelledby={ids.name}
          aria-describedby={errors.displayName ? ids.nameError : undefined}
          value={String(edits.selectedNameIndex)}
          onValueChange={(value) => onChange({ ...edits, selectedNameIndex: Number(value) })}
          disabled={disabled}
          className="gap-6"
        >
          {draft.nameOptions.map((option, index) => {
            const active = index === edits.selectedNameIndex;
            return (
              <Radio
                key={index}
                value={String(index)}
                label={
                  <span className="flex max-w-150 flex-col gap-2">
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
        <FieldError id={ids.nameError} message={errors.displayName} />
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading id={ids.headline}>Headline</SectionHeading>
        <TextInput
          aria-labelledby={ids.headline}
          aria-invalid={errors.headline ? true : undefined}
          aria-describedby={errors.headline ? ids.headlineError : undefined}
          value={edits.headline}
          onChange={(event) => onChange({ ...edits, headline: event.target.value })}
          disabled={disabled}
          className="h-14 max-w-125 px-4 text-body-lg"
        />
        <FieldError id={ids.headlineError} message={errors.headline} />
      </section>

      <section className="flex flex-col gap-6">
        <SectionHeading id={ids.about}>About</SectionHeading>
        <Textarea
          aria-labelledby={ids.about}
          aria-invalid={errors.bio ? true : undefined}
          aria-describedby={errors.bio ? ids.aboutError : undefined}
          rows={5}
          value={edits.bio}
          onChange={(event) => onChange({ ...edits, bio: event.target.value })}
          disabled={disabled}
          className="p-4 text-body-lg"
        />
        <FieldError id={ids.aboutError} message={errors.bio} />
      </section>

      {/* The keyword block sits below the captured viewport of the frame, so its chips and the
          Add tag control reuse the Tag and Button primitives rather than measured values.
          PROVISIONAL: spacing, chip treatment and the Add tag control's look. */}
      <section className="flex flex-col gap-5">
        <SectionHeading id={ids.keywords}>Search Keywords</SectionHeading>
        <TagGroup aria-labelledby={ids.keywords} className="gap-4">
          {edits.tags.map((tag, index) => (
            <Tag
              key={`${tag}-${index}`}
              onRemove={
                disabled
                  ? undefined
                  : () => onChange({ ...edits, tags: edits.tags.filter((_, i) => i !== index) })
              }
            >
              {tag}
            </Tag>
          ))}
        </TagGroup>
        <div className="flex max-w-125 items-center gap-3">
          <TextInput
            aria-label="New search keyword"
            aria-describedby={errors.tags ? ids.keywordsError : undefined}
            value={newTag}
            onChange={(event) => setNewTag(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTag();
              }
            }}
            disabled={disabled || edits.tags.length >= MAX_TAGS}
            className="h-11 px-4 text-body-lg"
          />
          <Button
            type="button"
            variant="outline"
            onClick={addTag}
            disabled={!canAddTag}
            className="h-11 shrink-0 text-body-lg font-medium"
          >
            Add tag
          </Button>
        </div>
        <FieldError id={ids.keywordsError} message={errors.tags} />
      </section>
    </div>
  );
}
