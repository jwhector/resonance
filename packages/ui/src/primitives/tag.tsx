import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/cn";

/**
 * Tag / TagGroup — keyword chips (Figma `Tags` component set `1409:46348`, instances
 * `1485:49379`, ADR-0012).
 *
 * `Tag` is a single chip; pass `onRemove` to make it removable — it renders a real
 * `<button>` with an accessible label ("Remove {label}") so the ✕ is keyboard- and
 * screen-reader-operable, not a bare glyph. `TagGroup` is the flex-wrap container that
 * lays a set of chips out and exposes them as a `role="list"` of `role="listitem"`s.
 * Native + token-only (no Radix needed): a chip is not a focus trap or a menu, so there
 * is no ARIA pattern to inherit — only the remove button needs a label, which we add.
 *
 * `tagVariants` is exported separately from the `Tag` element because the chip's *look*
 * and the chip's *semantics* have different owners. A chip that is only read is a
 * `listitem`; a chip that toggles a choice must be a real form control, and forcing that
 * through `Tag`'s span would mean either lying about the role or shipping a second chip
 * that drifts from this one. `TopicPicker` composes `tagVariants` onto a checkbox label
 * for exactly that reason (compare `buttonVariants`).
 */

/**
 * The chip's visual states, mapped 1:1 onto the Figma `Tags` variants:
 * `outline` = `Added` (`1409:46352`), `selectable` = `Selectable` (`1518:78061`),
 * `selected` = `Selectable/Selected` (`1519:78238`). All three share the frame's geometry —
 * a 2px border, 8px radius, 4px gap, and 12px/18px Medium type, in a 42px-tall box.
 *
 * The padding is 10px rather than the 12px the Figma inspector reports because Figma draws
 * the 2px stroke *inside* the padding box while CSS adds the border outside it. 10px of
 * padding plus the 2px border reproduces the drawn 42px box; 12px would render it at 46px.
 */
export const tagVariants = cva(
  "inline-flex items-center gap-1 rounded-md border-2 p-2.5 text-caption font-medium",
  {
    variants: {
      variant: {
        outline: "border-foreground text-foreground",
        selectable: "border-border text-foreground",
        selected: "border-primary bg-primary-subtle text-primary",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

export interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof tagVariants> {
  /** When provided, renders a ✕ button that calls this on click/Enter. */
  onRemove?: () => void;
  /**
   * Accessible label for the remove button. Defaults to `Remove {children}` when the
   * tag's content is a plain string; supply this when the content is not a string.
   */
  removeLabel?: string;
}

export const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  ({ className, children, onRemove, removeLabel, variant, ...props }, ref) => {
    const label =
      removeLabel ?? (typeof children === "string" ? `Remove ${children}` : "Remove tag");
    return (
      <span
        ref={ref}
        role="listitem"
        className={cn(tagVariants({ variant }), className)}
        {...props}
      >
        {children}
        {onRemove != null && (
          <button
            type="button"
            aria-label={label}
            onClick={onRemove}
            className={cn(
              "-mr-0.5 flex size-3 shrink-0 items-center justify-center rounded-sm text-current transition-colors",
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
