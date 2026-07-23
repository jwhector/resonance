import * as React from "react";
import { cn } from "../lib/cn";

/**
 * Textarea — the canonical multiline text field primitive (Figma `Input/About`, ADR-0012).
 * A styled native `<textarea>`: the browser owns focus/keyboard/ARIA, we own the look.
 * The sibling of `TextInput` — same tokens, same invalid handling — for fields that need
 * more than one line (e.g. the profile "About"/bio). Styled entirely with design tokens
 * (no raw hex/px). `aria-invalid` drives the invalid style so signal and look never drift.
 */
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "flex min-h-24 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors",
        "placeholder:text-subtle",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger",
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";
