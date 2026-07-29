import * as React from "react";
import {
  MEMBER_INTEREST_MAX,
  MEMBER_INTEREST_TARGET,
  type Topic,
  type TopicSlug,
} from "@resonance/core";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { tagVariants } from "../primitives/tag";
import { ResonanceMark } from "./resonance-mark";

/**
 * TopicPicker — the member's interest selection step (Figma
 * `Member/Onboarding/CreateAccount/Selection` `1554:79520`, manifest screen
 * `13-select-topics`, ADR-0012).
 *
 * A **controlled** composite over `@resonance/core`'s `Topic` contract: the caller owns the
 * topic list and the current selection, and this component renders them and reports
 * changes. It fetches nothing, holds no session, and calls no Server Action — `apps/web`
 * supplies the curated topics and persists the result.
 *
 * **Continue is never gated on a count.** The heading asks for `MEMBER_INTEREST_TARGET`
 * topics, but skipping is a supported outcome (`MemberInterestsSchema` takes a minimum of
 * zero), so submitting with an empty selection is a first-class path, not an error. The
 * only cap enforced here is `max`: once it is reached the *unselected* chips go disabled,
 * because the alternative is letting the UI build a payload the contract will reject.
 *
 * **Each chip is a real checkbox, not a styled div.** The chips are a multi-select, so they
 * carry checkbox semantics natively: Space toggles, each is in the tab order, and a screen
 * reader announces "Wellness, checkbox, checked" plus the group's name from the heading.
 * That also makes the picker submit correctly as part of a plain `<form>` — every checked
 * chip contributes its slug under `name`, which is what the Server Action will parse.
 */
export interface TopicPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onSubmit"> {
  /** The selectable topics, in the order they should be laid out. */
  topics: readonly Topic[];
  /** The currently selected slugs. The parent owns and updates them. */
  value: readonly TopicSlug[];
  /** Fires with the next selection whenever a chip is toggled. */
  onValueChange: (slugs: TopicSlug[]) => void;
  /** Fires with the current selection when "Continue" is pressed — including when empty. */
  onSubmit: (slugs: TopicSlug[]) => void;
  /**
   * How many topics the heading asks for. Guidance only — it changes the copy, never
   * whether the form can be submitted.
   */
  target?: number;
  /** Upper bound on the selection, mirroring the contract's cap. */
  max?: number;
  /** `name` on each checkbox, so the picker works inside a plain form POST. */
  name?: string;
  /** Disables the submit while the caller is persisting. */
  pending?: boolean;
  /** Submit label. The design reads "Continue". */
  submitLabel?: string;
}

export function TopicPicker({
  className,
  topics,
  value,
  onValueChange,
  onSubmit,
  target = MEMBER_INTEREST_TARGET,
  max = MEMBER_INTEREST_MAX,
  name = "topicSlugs",
  pending = false,
  submitLabel = "Continue",
  ...props
}: TopicPickerProps) {
  const headingId = React.useId();
  const selected = React.useMemo(() => new Set(value), [value]);
  const atMax = selected.size >= max;

  const toggle = (slug: TopicSlug) => {
    onValueChange(selected.has(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
  };

  return (
    <div className={cn("flex w-full max-w-125 flex-col gap-6", className)} {...props}>
      {/* Header: the wave mark over the ask (Figma gaps 24 / 8). */}
      <div className="flex flex-col items-center gap-6 text-center">
        <ResonanceMark className="h-6 w-20" />
        <div className="flex flex-col gap-2">
          <h1 id={headingId} className="text-heading-md font-medium text-foreground">
            Select {target} topics
          </h1>
          <p className="text-body-lg text-muted">
            We will suggest creators and offerings resonate with you
          </p>
        </div>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!pending) onSubmit([...value]);
        }}
      >
        {/* The chips sit in their own bordered panel: 16px radius, a 1px border, and the
            frame's 24px inset less that border, which Figma draws inside the padding box.
            The chips wrap rather than occupying the design's three fixed rows, because the
            topic list is a prop — at the design's width the wrap reproduces the drawn rows. */}
        <fieldset
          aria-labelledby={headingId}
          className="flex flex-wrap gap-2 rounded-lg border border-border p-5.75"
        >
          {topics.map((topic) => {
            const checked = selected.has(topic.slug);
            const disabled = !checked && atMax;
            return (
              <label
                key={topic.slug}
                className={cn(
                  tagVariants({ variant: checked ? "selected" : "selectable" }),
                  "cursor-pointer transition-colors select-none",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2",
                  disabled && "cursor-not-allowed opacity-50",
                )}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  name={name}
                  value={topic.slug}
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(topic.slug)}
                />
                {topic.label}
              </label>
            );
          })}
        </fieldset>

        <Button type="submit" variant="neutral" size="wide" disabled={pending}>
          {submitLabel}
        </Button>
      </form>
    </div>
  );
}
TopicPicker.displayName = "TopicPicker";
