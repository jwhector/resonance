import * as React from "react";
import type { CreatorResult } from "@resonance/core";
import { cn } from "../lib/cn";
import { CreatorResultRow } from "./creator-result-row";

/**
 * CreatorResultList — the Creators tab's ranked result stack (Figma `Frame 1000002698`
 * inside `1443:78153`, `design/manifest/screens/12-search-creators`, ADR-0012).
 *
 * A thin, **presentational** container: a semantic list of `CreatorResultRow`s at the
 * design's 24px rhythm, in the order the ranker returned them (the interface contract on
 * `DiscoveryPort` already guarantees descending similarity — this list must not re-sort).
 *
 * It renders nothing when `results` is empty. The two "nothing here" surfaces are deliberately
 * *not* its job: a zero-result search and a tab with no data source are different states with
 * different copy, and they live in `discovery-empty-states` so the page picks one explicitly
 * rather than the list guessing.
 */
export interface CreatorResultListProps extends Omit<
  React.HTMLAttributes<HTMLUListElement>,
  // `results` is a long-deprecated `<input>` attribute React still types as a number on
  // every element; ours is the ranked page, so the DOM one is shadowed rather than widened.
  "results"
> {
  /** The ranked page of creators, already ordered by the ranker. */
  results: readonly CreatorResult[];
  /** Builds each row's profile destination. Omit to render names as plain text. */
  hrefFor?: (result: CreatorResult) => string;
  /** Fires with the result whose Follow/Following control was used. */
  onFollowToggle?: (result: CreatorResult) => void;
  /** `userId`s whose follow mutation is in flight — those rows' controls are disabled. */
  pendingUserIds?: readonly string[];
  /** Accessible name for the list. */
  label?: string;
}

export function CreatorResultList({
  className,
  results,
  hrefFor,
  onFollowToggle,
  pendingUserIds,
  label = "Creator results",
  ...props
}: CreatorResultListProps) {
  return (
    <ul
      role="list"
      aria-label={label}
      className={cn("flex w-full flex-col gap-6", className)}
      {...props}
    >
      {results.map((result) => (
        <CreatorResultRow
          key={result.profileId}
          result={result}
          href={hrefFor?.(result)}
          onFollowToggle={onFollowToggle}
          followPending={pendingUserIds?.includes(result.userId) ?? false}
        />
      ))}
    </ul>
  );
}
CreatorResultList.displayName = "CreatorResultList";
