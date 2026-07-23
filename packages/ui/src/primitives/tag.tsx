import * as React from "react";
import { cn } from "../lib/cn";

/**
 * Tag / TagGroup — keyword chips (Figma `Tags` / `TagGroup`, `1485:49379`, ADR-0012).
 *
 * `Tag` is a single outlined chip; pass `onRemove` to make it removable — it renders a
 * real `<button>` with an accessible label ("Remove {label}") so the ✕ is keyboard- and
 * screen-reader-operable, not a bare glyph. `TagGroup` is the flex-wrap container that
 * lays a set of chips out and exposes them as a `role="list"` of `role="listitem"`s.
 * Native + token-only (no Radix needed): a chip is not a focus trap or a menu, so there
 * is no ARIA pattern to inherit — only the remove button needs a label, which we add.
 */
export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** When provided, renders a ✕ button that calls this on click/Enter. */
  onRemove?: () => void;
  /**
   * Accessible label for the remove button. Defaults to `Remove {children}` when the
   * tag's content is a plain string; supply this when the content is not a string.
   */
  removeLabel?: string;
}

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, children, onRemove, removeLabel, ...props }, ref) => {
    const label =
      removeLabel ?? (typeof children === "string" ? `Remove ${children}` : "Remove tag");
    return (
      <span
        ref={ref}
        role="listitem"
        className={cn(
          "inline-flex items-center gap-1 rounded-md border-2 border-foreground p-3 text-caption font-medium text-foreground",
          className,
        )}
        {...props}
      >
        {children}
        {onRemove != null && (
          <button
            type="button"
            aria-label={label}
            onClick={onRemove}
            className={cn(
              "-mr-0.5 flex size-3 shrink-0 items-center justify-center rounded-sm text-foreground transition-colors",
              "hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-3"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </span>
    );
  },
);
Tag.displayName = "Tag";

export type TagGroupProps = React.HTMLAttributes<HTMLDivElement>;

export const TagGroup = React.forwardRef<HTMLDivElement, TagGroupProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="list"
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  ),
);
TagGroup.displayName = "TagGroup";
