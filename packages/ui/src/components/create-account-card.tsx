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
  consentLabel = "I agree to the Terms of Service and Privacy Policy.",
  ...props
}: CreateAccountCardProps) {
  const [email, setEmail] = React.useState("");
  const [consent, setConsent] = React.useState(false);
  const emailId = React.useId();

  const canSubmit = email.trim().length > 0 && consent;

  return (
    <div
      className={cn(
        "flex w-full max-w-sm flex-col gap-6 rounded-lg border border-border bg-surface p-8 shadow-md",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="bg-brand-gradient size-12 rounded-xl" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">Welcome to Resonance</h1>
          <p className="text-sm text-muted">Create your account with email</p>
        </div>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) onSubmit({ email: email.trim(), consent });
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor={emailId} className="text-sm font-medium text-foreground">
            Email
          </label>
          <TextInput
            id={emailId}
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

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
