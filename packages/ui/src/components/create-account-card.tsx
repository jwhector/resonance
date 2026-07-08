import * as React from "react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { Checkbox } from "../primitives/checkbox";
import { TextInput } from "../primitives/text-input";

/** Values emitted when the account form is submitted. */
export interface CreateAccountValues {
  email: string;
  consent: boolean;
}

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
 * CreateAccountCard — the magic-link sign-up card (Figma `CreateAccount`, `1526:78839`).
 * Presentational: it owns only local form state and calls `onSubmit` — no data
 * fetching, no auth calls. Composed from the `TextInput`, `Checkbox`, and `Button`
 * primitives; styled with tokens only.
 */
export function CreateAccountCard({
  className,
  onSubmit,
  consentLabel = "I agree Resonance's Term of Use, and acknowledge its Information Collection Notice and Privacy Policy",
  ...props
}: CreateAccountCardProps) {
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);

  const canSubmit = email.trim().length > 0 && consent;

  return (
    <div
      className={cn(
        "flex w-full max-w-md flex-col gap-10 rounded-lg border border-border bg-surface p-8",
        className,
      )}
      {...props}
    >
      {/* Header: Resonance wordmark over the welcome copy (Figma gaps 24 / 8). */}
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="bg-brand-gradient h-6 w-20 rounded-md" aria-hidden="true" />
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
          Create account
        </Button>
      </form>
    </div>
  );
}
CreateAccountCard.displayName = "CreateAccountCard";
