import * as React from "react";
import type { CreatorResult } from "@resonance/core";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";

/**
 * CreatorResultRow — one ranked creator in the discovery results (Figma
 * `List/Profile&Button/Small` `1443:78163`, `design/manifest/screens/12-search-creators`,
 * ADR-0012).
 *
 * **Presentational and controlled**, bound directly to `@resonance/core`'s `CreatorResult`:
 * a 48px row of image slot + name + Weave badge + subtitle on the left, and the
 * Follow/Following control right-aligned. It performs no mutation — `onFollowToggle` hands
 * the whole result back to the parent, which owns the Server Action, the session, and the
 * signed-out prompt.
 *
 * All three `FollowState`s render:
 *
 * | state           | label       | treatment                  | `aria-pressed` |
 * | --------------- | ----------- | -------------------------- | -------------- |
 * | `following`     | `Following` | muted surface + dark label | `true`         |
 * | `not_following` | `Follow`    | brand fill + white label   | `false`        |
 * | `unknown`       | `Follow`    | brand fill + white label   | *(absent)*     |
 *
 * `unknown` is the signed-out viewer: the design still draws the control, so it renders the
 * default affordance and defers — and `aria-pressed` is **omitted** rather than set to
 * `false`, because "not followed" and "we cannot know" are different claims and the row must
 * not assert the first when it only knows the second.
 *
 * ## Enumerated ADR-0019 parity deltas
 *
 * 1. **Avatar imagery.** `creator_profiles` has no image column, so the 48×48 / radius-8 slot
 *    carries an initials placeholder on the design's own `#d9d9d9` plate
 *    (`--color-image-placeholder`). Geometry is exact so closing the gap is a fill swap, not
 *    a relayout. There is deliberately **no image prop** — inventing one would imply a data
 *    source that does not exist. Real imagery: `resonance-0407`.
 * 2. **Subtitle.** The frame reads "By &lt;person&gt;", an attribution with no field behind it
 *    in `CreatorResult` (or in `creator_profiles`). The row renders the creator's `headline`
 *    in that slot — same geometry and colour, different sentence.
 * 3. **Weave badge — `PROVISIONAL`.** Every designed row carries it, so whether it is
 *    unconditional chrome or conditional on some creator attribute cannot be read off the
 *    frame. Rendered unconditionally and decoratively until the designer resolves it.
 */
export interface CreatorResultRowProps extends React.LiHTMLAttributes<HTMLLIElement> {
  /** The ranked creator to render. */
  result: CreatorResult;
  /** Destination for the creator's profile. When set, the display name becomes a link. */
  href?: string;
  /** Fires with the whole result when the Follow/Following control is used. */
  onFollowToggle?: (result: CreatorResult) => void;
  /** True while this row's follow mutation is in flight — disables the control. */
  followPending?: boolean;
}

/**
 * Up to two initials from a display name. Splits on whitespace and takes whole code points,
 * so an emoji or an astral-plane initial is not sliced in half.
 */
export function initialsFor(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => Array.from(word)[0] ?? "");
  const initials = letters.join("").toUpperCase();
  return initials.length > 0 ? initials : "?";
}

/** `Symbol/Weave/24px` — the spectrum badge beside a creator's name (delta 3, PROVISIONAL). */
function WeaveBadge() {
  return (
    <span
      aria-hidden="true"
      className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-gradient"
    >
      <span className="size-3 rounded-full bg-surface" />
    </span>
  );
}

export function CreatorResultRow({
  className,
  result,
  href,
  onFollowToggle,
  followPending = false,
  ...props
}: CreatorResultRowProps) {
  const following = result.followState === "following";

  return (
    <li
      data-follow-state={result.followState}
      className={cn("flex h-12 w-full items-center justify-between gap-4", className)}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-4">
        {/* Image slot — initials placeholder at the designed geometry (delta 1). */}
        <span
          aria-hidden="true"
          className="grid size-12 shrink-0 place-items-center rounded-md bg-image-placeholder text-heading-sm font-medium text-foreground"
        >
          {initialsFor(result.displayName)}
        </span>

        <div className="flex min-w-0 flex-col">
          <span className="flex h-6 items-center gap-4">
            {href === undefined ? (
              <span className="truncate text-heading-sm font-medium text-gray-0">
                {result.displayName}
              </span>
            ) : (
              <a
                href={href}
                className={cn(
                  "truncate rounded-sm text-heading-sm font-medium text-gray-0 hover:underline",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                )}
              >
                {result.displayName}
              </a>
            )}
            <WeaveBadge />
          </span>
          {/* Subtitle slot — headline stands in for the designed "By <person>" (delta 2). */}
          <span className="h-6 truncate text-body-lg text-muted">{result.headline}</span>
        </div>
      </div>

      <Button
        type="button"
        variant={following ? "secondary" : "primary"}
        aria-pressed={result.followState === "unknown" ? undefined : following}
        aria-label={`${following ? "Unfollow" : "Follow"} ${result.displayName}`}
        data-follow-state={result.followState}
        disabled={followPending}
        onClick={() => onFollowToggle?.(result)}
        className="h-12 shrink-0 px-4 text-body-lg font-medium shadow-none"
      >
        {following ? "Following" : "Follow"}
      </Button>
    </li>
  );
}
CreatorResultRow.displayName = "CreatorResultRow";
