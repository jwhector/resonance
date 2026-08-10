"use client";

import * as React from "react";
import type { Topic, TopicSlug } from "@resonance/core";
import { TopicPicker } from "@resonance/ui";
import { saveInterestsFromForm } from "./actions";

export interface InterestsFormProps {
  /** The curated taxonomy, in the order the picker should lay it out. */
  topics: readonly Topic[];
  /** Slugs already stored for this member — empty for a new account. */
  initialSelection: readonly TopicSlug[];
}

/**
 * Owns the selection state for {@link TopicPicker} and hands it the Server Action.
 *
 * A thin client boundary and nothing more (ADR-0002): `TopicPicker` is a controlled component, so
 * *someone* client-side has to hold the toggled slugs, but no rule about interests lives here.
 *
 * Submission is the **native** path — `action` is passed through, so the checked chips POST
 * themselves and the step still works with JavaScript disabled. `onSubmit` is therefore not a
 * second submit: it only reflects that one is in flight, which is what stops a double-click from
 * firing two writes while the server round-trips and redirects.
 */
export function InterestsForm({ topics, initialSelection }: InterestsFormProps) {
  const [selection, setSelection] = React.useState<readonly TopicSlug[]>(initialSelection);

  // React's documented "adjusting state when props change" pattern. A bare
  // `useState(initialSelection)` goes stale under the App Router, because a re-render from a server
  // navigation re-runs this component with new props while keeping the old state.
  const [lastInitial, setLastInitial] = React.useState(initialSelection);
  if (lastInitial !== initialSelection) {
    setLastInitial(initialSelection);
    setSelection(initialSelection);
  }

  const [submitting, setSubmitting] = React.useState(false);

  return (
    <TopicPicker
      topics={topics}
      value={selection}
      onValueChange={setSelection}
      action={saveInterestsFromForm}
      onSubmit={() => setSubmitting(true)}
      pending={submitting}
    />
  );
}
