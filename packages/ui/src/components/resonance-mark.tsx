import * as React from "react";
import { cn } from "../lib/cn";

/**
 * ResonanceMark — the Resonance wave logo (Figma `Logo/Resonance`, 80×24), a spectrum-
 * stroked triple loop. Shared by the app-nav and the onboarding screens. Token-only
 * approximation of the real SVG asset (import tracked in resonance-cbbb). Size it with
 * `className` (e.g. `h-6 w-20`); the accessible name defaults to "Resonance".
 */
export type ResonanceMarkProps = React.SVGProps<SVGSVGElement>;

export function ResonanceMark({ className, ...props }: ResonanceMarkProps) {
  // Unique gradient id per instance (colons from useId break url(#…) references).
  const gid = "resonance-mark-" + React.useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 48 16"
      fill="none"
      strokeWidth={2.5}
      strokeLinecap="round"
      role="img"
      aria-label="Resonance"
      className={cn("block", className)}
      {...props}
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="48" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--color-brand-cyan)" />
          <stop offset="25%" stopColor="var(--color-brand-indigo)" />
          <stop offset="50%" stopColor="var(--color-brand-purple)" />
          <stop offset="75%" stopColor="var(--color-brand-pink)" />
          <stop offset="100%" stopColor="var(--color-brand-orange)" />
        </linearGradient>
      </defs>
      <path d="M1 8c3-6 7-6 10 0s7 6 10 0 7-6 10 0 7 6 10 0" stroke={`url(#${gid})`} />
    </svg>
  );
}
ResonanceMark.displayName = "ResonanceMark";
