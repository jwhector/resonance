import * as React from "react";
import { cn } from "../lib/cn";

/**
 * TextInput — the canonical text field primitive (Figma `Input/TextInput`, ADR-0012).
 * A styled native `<input>`: the browser owns focus/keyboard/ARIA, we own the look.
 * Styled entirely with design tokens (no raw hex/px). Follows the Button primitive
 * shape: `forwardRef` + `cn()`. Invalid state is driven by `aria-invalid` so the
 * accessible signal and the visual signal can never drift apart.
 */
export type TextInputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-10 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors",
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
TextInput.displayName = "TextInput";
