import * as React from "react";
import type { ResultKind } from "@resonance/core";
import { cn } from "../lib/cn";

/**
 * The two "no rows" surfaces of the discovery results screen — deliberately in one file,
 * because the thing that matters about them is that they are **not the same state** and that
 * invariant should be readable in one place (`pl-bbca` risk 7; an RTL test asserts it).
 *
 * - {@link ComingSoonState} — the tab has **no data source yet**. Products, Services and Posts
 *   are structurally real (the design's tab bar has them) but `Offering` carries no price,
 *   image, or type and `@resonance/community` is a stub, so nothing can be searched there this
 *   slice. This is a product statement, not a search outcome.
 * - {@link NoResultsState} — the tab **searched and found nothing**. A real outcome for a real
 *   query, and the fix is a different query.
 *
 * They are told apart four ways, so the distinction cannot quietly regress into two identical
 * blanks: different headings, different body copy, a `Coming soon` badge on a bordered muted
 * panel vs. plain centred prose, a `data-empty-state` marker, and only the search outcome is
 * announced as a live `role="status"`.
 */

/** The three designed tabs with no data source in Slice A. */
export type ComingSoonKind = Exclude<ResultKind, "creators">;

/** Singular noun per tab, so one signed-off sentence covers all three. */
const COMING_SOON_NOUN: Record<ComingSoonKind, string> = {
  products: "Product",
  services: "Service",
  posts: "Post",
};

/** Signed off in `pl-bbca` review — do not paraphrase. */
const COMING_SOON_BODY =
  "Creators are searchable today. Products, services and posts arrive with the next member slices.";

export interface ComingSoonStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Which dataless tab is showing. Drives the noun in the heading. */
  kind: ComingSoonKind;
}

export function ComingSoonState({ className, kind, ...props }: ComingSoonStateProps) {
  return (
    <div
      data-empty-state="coming-soon"
      className={cn(
        "flex w-full flex-col items-center gap-4 rounded-md border border-border bg-surface-muted px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      <span className="rounded-md bg-primary-50 px-3 py-1 text-caption font-medium tracking-wide text-primary uppercase">
        Coming soon
      </span>
      <h2 className="text-heading-md font-medium text-foreground">
        {COMING_SOON_NOUN[kind]} search is coming soon
      </h2>
      <p className="max-w-md text-body-lg text-muted">{COMING_SOON_BODY}</p>
    </div>
  );
}
ComingSoonState.displayName = "ComingSoonState";

export interface NoResultsStateProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The query that returned nothing — echoed back so the member can see what was searched. */
  query: string;
}

export function NoResultsState({ className, query, ...props }: NoResultsStateProps) {
  return (
    <div
      role="status"
      data-empty-state="no-results"
      className={cn("flex w-full flex-col items-center gap-2 px-6 py-12 text-center", className)}
      {...props}
    >
      <h2 className="text-heading-md font-medium text-foreground">No creators match “{query}”</h2>
      <p className="max-w-md text-body-lg text-muted">
        Try a different word, or search for what someone makes rather than their name.
      </p>
    </div>
  );
}
NoResultsState.displayName = "NoResultsState";
