import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "../lib/cn";

/**
 * Radio / RadioGroup — single-choice control (Figma `Radio/Box`, ADR-0012). Reused by
 * the profile name-option chooser later in the slice.
 *
 * Wraps Radix `RadioGroup` (Root) + `RadioGroupItem` (Item + Indicator): Radix owns the
 * roving focus, arrow-key navigation, shared `name`, and `role="radiogroup"` — we own
 * only the token styling and the auto-wired `label`. Controlled via `value` +
 * `onValueChange`, or uncontrolled via `defaultValue`. Tokens only (no raw hex).
 */
export type RadioGroupProps = React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>;

export const RadioGroup = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Root>,
  RadioGroupProps
>(({ className, ...props }, ref) => (
  <RadioGroupPrimitive.Root ref={ref} className={cn("flex flex-col gap-2", className)} {...props} />
));
RadioGroup.displayName = "RadioGroup";

export interface RadioProps extends Omit<
  React.ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>,
  "children"
> {
  /** The value this option contributes to the group. */
  value: string;
  /** Text/nodes rendered beside the dot and wired to it via `htmlFor`. */
  label?: React.ReactNode;
}

export const Radio = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  RadioProps
>(({ className, label, id, ...props }, ref) => {
  const generatedId = React.useId();
  const inputId = id ?? generatedId;
  return (
    <div className="flex items-start gap-4">
      <RadioGroupPrimitive.Item
        ref={ref}
        id={inputId}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface",
          "data-[state=checked]:border-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        <RadioGroupPrimitive.Indicator className="flex items-center justify-center">
          <span className="size-2.5 rounded-full bg-primary" />
        </RadioGroupPrimitive.Indicator>
      </RadioGroupPrimitive.Item>
      {label != null && (
        <label htmlFor={inputId} className="select-none text-body-lg text-foreground">
          {label}
        </label>
      )}
    </div>
  );
});
Radio.displayName = "Radio";
