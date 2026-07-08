import * as React from "react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { MailIcon } from "../primitives/mail-icon";
import { OtpInput } from "../primitives/otp-input";

const CODE_LENGTH = 6;

export interface EmailVerifyCardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onSubmit"
> {
  /** Address the magic link / code was sent to; shown in the body copy. */
  email: string;
  /** Fires with the entered code when the user continues. */
  onSubmit: (code: string) => void;
  /** Fires when the user asks to resend the email. */
  onResend: () => void;
}

/**
 * EmailVerifyCard — the "check your email" step (Figma `EmailVerication`, `1526:79050`).
 * Presentational: owns the local code state and calls `onSubmit`/`onResend` — no
 * network. Composed from `MailIcon`, `OtpInput`, and `Button`; tokens only.
 */
export function EmailVerifyCard({
  className,
  email,
  onSubmit,
  onResend,
  ...props
}: EmailVerifyCardProps) {
  const [code, setCode] = React.useState("");
  const canContinue = code.length === CODE_LENGTH;

  return (
    <div
      className={cn(
        "flex w-full max-w-sm flex-col items-center gap-6 rounded-lg border border-border bg-surface p-8 text-center shadow-md",
        className,
      )}
      {...props}
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-primary-100 text-primary">
        <MailIcon className="size-6" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-foreground">Check your email to continue</h1>
        <p className="text-sm text-muted">
          We&apos;ve sent an email to <span className="font-medium text-foreground">{email}</span>.
          Click the magic link or enter the code below:
        </p>
      </div>

      <OtpInput
        value={code}
        onChange={setCode}
        length={CODE_LENGTH}
        aria-label="Email verification code"
      />

      <Button type="button" size="wide" disabled={!canContinue} onClick={() => onSubmit(code)}>
        Continue
      </Button>

      <p className="text-sm text-muted">
        Didn&apos;t get the email?{" "}
        <button
          type="button"
          onClick={onResend}
          className="rounded-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Try again
        </button>
      </p>
    </div>
  );
}
EmailVerifyCard.displayName = "EmailVerifyCard";
