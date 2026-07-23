import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { cn } from "../lib/cn";

/**
 * Checkbox — labeled boolean control (Figma `Checkbox/Text`, ADR-0012).
 * Wraps Radix `Checkbox` (Root + Indicator) so keyboard, focus, and ARIA come from
 * Radix — we own only the token styling. The optional `label` is auto-wired to the
 * control via a shared id so clicking the text toggles the box. Radix drives state
 * through `checked`/`defaultChecked` + `onCheckedChange`. Tokens only (no raw hex).
 */
export interface CheckboxProps extends React.ComponentPropsWithoutRef<
  typeof CheckboxPrimitive.Root
> {
  /** Text/nodes rendered beside the box and wired to it via `htmlFor`. */
  label?: React.ReactNode;
}

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  CheckboxProps
>(({ className, label, id, ...props }, ref) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex items-start gap-4">
      <CheckboxPrimitive.Root
        ref={ref}
        id={inputId}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-sm border border-border-strong bg-surface text-on-primary",
          "data-[state=checked]:border-primary data-[state=checked]:bg-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="size-4"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
      {label != null && (
        <label htmlFor={inputId} className="select-none text-body-lg text-foreground">
          {label}
        </label>
      )}
    </div>
  );
});
Checkbox.displayName = "Checkbox";
