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
 * network. Composed from `MailIcon`, `OtpInput`, and `Button`; tokens only. The design is
 * cardless — a centered ~400px column on the white page, not a bordered card.
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
      className={cn("flex w-full max-w-sm flex-col items-center gap-9 text-center", className)}
      {...props}
    >
      {/* Header group: envelope glyph + copy (Figma gaps 16 / 8). */}
      <div className="flex flex-col items-center gap-4">
        <MailIcon className="size-8 text-foreground" />
        <div className="flex flex-col gap-2">
          <h1 className="text-heading-md font-medium text-foreground">
            Check your email to continue
          </h1>
          <p className="text-body-lg text-muted">
            We&apos;ve sent an email to {email}. Click the magic link or enter the code below:
          </p>
        </div>
      </div>

      <OtpInput
        value={code}
        onChange={setCode}
        length={CODE_LENGTH}
        aria-label="Email verification code"
      />

      {/* Footer group: primary action + resend (Figma gaps 16 / 8). */}
      <div className="flex w-full flex-col items-center gap-4">
        <Button type="button" size="wide" disabled={!canContinue} onClick={() => onSubmit(code)}>
          Continue
        </Button>

        <div className="flex items-center gap-2 text-body-lg text-muted">
          <span>Didn&apos;t get the email?</span>
          <button
            type="button"
            onClick={onResend}
            className="rounded-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
EmailVerifyCard.displayName = "EmailVerifyCard";
