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

export interface RadioCardProps extends React.ComponentPropsWithoutRef<
  typeof RadioGroupPrimitive.Item
> {
  /** The value this option contributes to the group. */
  value: string;
}

/**
 * RadioCard — a single-choice option drawn as a whole outlined box with no dot, for choices
 * whose label *is* the control (the expression-style options, Figma `1556:79716`). Same Radix
 * item as `Radio`, so it keeps the group's roving focus and arrow-key selection; the children
 * become the radio's accessible name.
 *
 * The selected state is the design's 2px Resonance-indigo border. The unselected border is
 * also 2px so selecting an option does not shift the layout, and the padding is 2px less
 * than the drawn inset because CSS adds the border outside the padding box where Figma draws
 * the stroke inside it. PROVISIONAL: the unselected stroke width and colour are read off the
 * screenshot, not the frame inspector.
 */
export const RadioCard = React.forwardRef<
  React.ComponentRef<typeof RadioGroupPrimitive.Item>,
  RadioCardProps
>(({ className, children, ...props }, ref) => (
  <RadioGroupPrimitive.Item
    ref={ref}
    className={cn(
      "flex h-14 w-full items-center rounded-md border-2 border-border bg-surface px-3.5 text-left text-body-lg text-foreground transition-colors",
      "hover:border-border-strong",
      "data-[state=checked]:border-primary data-[state=checked]:text-primary",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
  </RadioGroupPrimitive.Item>
));
RadioCard.displayName = "RadioCard";
