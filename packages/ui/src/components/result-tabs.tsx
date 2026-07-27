import * as React from "react";
import type { ResultKind } from "@resonance/core";
import { cn } from "../lib/cn";

/**
 * ResultTabs — the four-way discovery result scope selector (Figma `Tabs/Search`
 * `1443:78159`, `design/manifest/screens/12-search-creators`, ADR-0012).
 *
 * A **controlled** tablist over `@resonance/core`'s `ResultKind`: the parent owns the
 * selected scope (in Resonance it is URL state) and this component renders it and reports
 * changes. It owns no panels — each scope's content is the page's business.
 *
 * The design draws the 2px rule under **every** tab, not only the selected one: the idle
 * bars form a continuous muted rule and the active tab darkens its own segment. Only colour
 * changes on selection — no weight or size change. Four equal-width tabs fill the row (151px
 * each in the design's 604px column).
 *
 * Keyboard behaviour is the WAI-ARIA tabs pattern with automatic activation: roving
 * tabindex, ←/→ to move between scopes, Home/End to jump to the ends.
 */

/**
 * Presentation order, which is deliberately **not** `RESULT_KINDS`' declaration order —
 * the tab bar's order is a design concern and lives here, in `@resonance/ui`, exactly as
 * `@resonance/core` says. Exported so the page can map routes to tabs without re-deriving it.
 */
export const RESULT_TAB_ORDER = [
  "products",
  "services",
  "posts",
  "creators",
] as const satisfies readonly ResultKind[];

const TAB_LABELS: Record<ResultKind, string> = {
  products: "Products",
  services: "Services",
  posts: "Posts",
  creators: "Creators",
};

export interface ResultTabsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  /** The selected result scope. The parent owns and updates it. */
  value: ResultKind;
  /** Fires with the newly selected scope. */
  onValueChange: (kind: ResultKind) => void;
  /** Accessible name for the tablist. */
  label?: string;
}

export function ResultTabs({
  className,
  value,
  onValueChange,
  label = "Search results",
  ...props
}: ResultTabsProps) {
  const listRef = React.useRef<HTMLDivElement>(null);

  const moveTo = (index: number) => {
    const next = RESULT_TAB_ORDER[(index + RESULT_TAB_ORDER.length) % RESULT_TAB_ORDER.length];
    if (next === undefined) return;
    onValueChange(next);
    listRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [RESULT_TAB_ORDER.indexOf(next)]?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      className={cn("flex w-full", className)}
      {...props}
    >
      {RESULT_TAB_ORDER.map((kind, index) => {
        const active = kind === value;
        return (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            data-result-kind={kind}
            onClick={() => onValueChange(kind)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") moveTo(index + 1);
              else if (event.key === "ArrowLeft") moveTo(index - 1);
              else if (event.key === "Home") moveTo(0);
              else if (event.key === "End") moveTo(RESULT_TAB_ORDER.length - 1);
              else return;
              event.preventDefault();
            }}
            className={cn(
              "flex flex-1 flex-col items-center gap-4.25 rounded-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            )}
          >
            <span
              className={cn(
                "text-heading-md font-medium transition-colors",
                active ? "text-foreground" : "text-muted",
              )}
            >
              {TAB_LABELS[kind]}
            </span>
            {/* The rule under every tab; the active segment darkens. */}
            <span
              aria-hidden="true"
              className={cn("h-0.5 w-full", active ? "bg-foreground" : "bg-muted")}
            />
          </button>
        );
      })}
    </div>
  );
}
ResultTabs.displayName = "ResultTabs";
