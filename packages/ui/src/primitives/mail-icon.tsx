import * as React from "react";
import { cn } from "../lib/cn";

/**
 * MailIcon — envelope glyph for the email-verify screen (Figma node `1526:79082`).
 * Decorative by default (`aria-hidden`) since an adjacent heading carries the meaning;
 * drawn with `currentColor` so it inherits the token text color. Sized via `size-*`.
 */
export type MailIconProps = React.SVGProps<SVGSVGElement>;

export function MailIcon({ className, ...props }: MailIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-6", className)}
      {...props}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
}
MailIcon.displayName = "MailIcon";
