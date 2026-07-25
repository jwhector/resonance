import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { ResonanceMark } from "./resonance-mark";

/**
 * The pre-onboarding intent fork. Two values route into the creator flow, one into the
 * member (discovery) flow — the app owns that mapping, not this component.
 */
export type OnboardingIntent = "explore" | "share" | "business";

interface IntentOption {
  value: OnboardingIntent;
  label: string;
}

/** Copy + order from Figma `1519:78312` (manifest screen 01-what-brought-you). */
export const INTENT_OPTIONS: readonly IntentOption[] = [
  { value: "explore", label: "I'm exploring/ buying" },
  { value: "share", label: "I want to share my works" },
  { value: "business", label: "I have a business, and I want to connect with customers" },
];

export interface IntentPickerCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onSubmit"
> {
  /** Fires with the chosen intent once an option is selected and "Next" is pressed. */
  onSubmit: (intent: OnboardingIntent) => void;
}

/**
 * IntentPickerCard — the "What brought you?" intent fork (Figma `1519:78312`, manifest
 * screen `01-what-brought-you`). Presentational: it owns only the local selection and
 * calls `onSubmit` — no routing, no data. The design is cardless (a centered ~500px
 * column on the white page the onboarding layout provides), and each option is a
 * full-width bordered box rather than a dot-style radio, so it wraps Radix `RadioGroup`
 * directly (roving focus / arrow keys / `role="radiogroup"`) instead of the `Radio`
 * primitive. Tokens only. Its muted "Next" is the design's pre-selection Button/Wide
 * treatment — the same gray fill as create-account's "Continue".
 */
export function IntentPickerCard({ className, onSubmit, ...props }: IntentPickerCardProps) {
  const [intent, setIntent] = React.useState<OnboardingIntent | "">("");

  return (
    <div className={cn("flex w-full max-w-lg flex-col gap-10", className)} {...props}>
      {/* Header: Resonance wave mark over the heading (no subtext on this screen). */}
      <div className="flex flex-col items-center gap-6 text-center">
        <ResonanceMark className="h-6 w-20" />
        <h1 className="text-heading-md font-medium text-foreground">
          What brought you to here today?
        </h1>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (intent) onSubmit(intent);
        }}
      >
        <RadioGroupPrimitive.Root
          aria-label="What brought you to here today?"
          value={intent}
          onValueChange={(value) => setIntent(value as OnboardingIntent)}
          className="flex flex-col gap-4"
        >
          {INTENT_OPTIONS.map((option) => (
            <RadioGroupPrimitive.Item
              key={option.value}
              value={option.value}
              className={cn(
                "w-full rounded-lg border-2 border-border-strong bg-surface p-4 text-left text-body-lg text-foreground",
                "data-[state=checked]:border-primary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              )}
            >
              {option.label}
            </RadioGroupPrimitive.Item>
          ))}
        </RadioGroupPrimitive.Root>

        <Button type="submit" size="wide" disabled={!intent}>
          Next
        </Button>
      </form>
    </div>
  );
}
IntentPickerCard.displayName = "IntentPickerCard";
