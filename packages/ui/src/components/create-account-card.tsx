import * as React from "react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Checkbox } from "../primitives/checkbox";
import { TextInput } from "../primitives/text-input";
import { ResonanceMark } from "./resonance-mark";

/** Values emitted when the account form is submitted. */
export interface CreateAccountValues {
  email: string;
  consent: boolean;
}

/** The Figma consent copy, with the three legal terms underlined as links (hrefs deferred). */
const DEFAULT_CONSENT = (
  <>
    I agree Resonance&apos;s <span className="underline">Term of Use</span>, and acknowledge its{" "}
    <span className="underline">Information Collection Notice</span> and{" "}
    <span className="underline">Privacy Policy</span>
  </>
);

export interface CreateAccountCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onSubmit"
> {
  /** Fires with the entered email once consent is given and the form is submitted. */
  onSubmit: (values: CreateAccountValues) => void;
  /** Consent copy beside the checkbox; app supplies the real linked legal text. */
  consentLabel?: React.ReactNode;
}

/**
 * CreateAccountCard — the magic-link sign-up screen (Figma `CreateAccount`, `1526:78839`).
 * Presentational: it owns only local form state and calls `onSubmit` — no data
 * fetching, no auth calls. Composed from the `TextInput`, `Checkbox`, and `Button`
 * primitives; styled with tokens only. The design is cardless — a centered ~500px column
 * on the white page (the onboarding layout provides the surface), not a bordered card.
 */
export function CreateAccountCard({
  className,
  onSubmit,
  consentLabel = DEFAULT_CONSENT,
  ...props
}: CreateAccountCardProps) {
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);

  const canSubmit = email.trim().length > 0 && consent;

  return (
    <div className={cn("flex w-full max-w-lg flex-col gap-10", className)} {...props}>
      {/* Header: Resonance wave mark over the welcome copy (Figma gaps 24 / 8). */}
      <div className="flex flex-col items-center gap-6 text-center">
        <ResonanceMark className="h-6 w-20" />
        <div className="flex flex-col gap-2">
          <h1 className="text-heading-md font-medium text-foreground">Welcome to Resonance</h1>
          <p className="text-body-lg text-muted">Create your account with email</p>
        </div>
      </div>

      {/* Form (Figma gap 16). The email field is placeholder-labelled in the design; we
          keep an aria-label so the control still has an accessible name. */}
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) onSubmit({ email: email.trim(), consent });
        }}
      >
        <TextInput
          type="email"
          required
          autoComplete="email"
          aria-label="Email"
          placeholder="Type your email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-14 px-4 text-body-lg"
        />

        <Checkbox
          checked={consent}
          onCheckedChange={(checked) => setConsent(checked === true)}
          label={consentLabel}
        />

        <Button type="submit" size="wide" disabled={!canSubmit}>
          Continue
        </Button>
      </form>
    </div>
  );
}
CreateAccountCard.displayName = "CreateAccountCard";
