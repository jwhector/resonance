import * as React from "react";
import { cn } from "../lib/cn";
import { ResonanceMark } from "./resonance-mark";

/**
 * AppNav — the persistent 80px left application rail (Figma `Navigation/SideBar`
 * `1443:78284`, shared chrome across the authenticated screens, ADR-0012 / ADR-0002).
 *
 * Purely presentational and logic-free: a top-aligned stack of the Resonance wave mark,
 * the section icons (home / orders / calendar), and the Weave + account avatars. The
 * section destinations are unbuilt, so the icon controls render inert placeholders; the
 * brand marks are token-only approximations of the real SVG assets (seed resonance-cbbb).
 * Tokens only, no raw hex/px. Composed by the app shell, which owns any routing.
 */
export type AppNavProps = React.HTMLAttributes<HTMLElement>;

/** An inert placeholder for an unbuilt section — the icon reads, the destination is pending. */
function NavIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled
      className="grid size-10 place-items-center rounded-md text-subtle"
    >
      {children}
    </button>
  );
}

export function AppNav({ className, ...props }: AppNavProps) {
  return (
    <nav
      aria-label="Main"
      className={cn(
        "flex h-full w-20 shrink-0 flex-col items-center gap-4 border-r border-border bg-surface py-6",
        className,
      )}
      {...props}
    >
      <ResonanceMark className="w-full px-1" />

      <NavIcon label="Home">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-6"
        >
          <path d="M3 10.5 12 3l9 7.5M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
        </svg>
      </NavIcon>

      <NavIcon label="Orders">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-6"
        >
          <path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" />
          <path d="m3 8 9 5 9-5M12 13v8" />
        </svg>
      </NavIcon>

      <NavIcon label="Calendar">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-6"
        >
          <rect x="3" y="4.5" width="18" height="16" rx="2" />
          <path d="M3 9h18M8 3v3M16 3v3" />
        </svg>
      </NavIcon>

      {/* Weave assistant avatar + account avatar — token-approximated brand orbs (resonance-cbbb). */}
      <span aria-hidden="true" className="size-9 rounded-full bg-primary" />
      <span
        aria-hidden="true"
        className="size-9 rounded-full"
        style={{
          backgroundImage:
            "linear-gradient(140deg, var(--color-brand-indigo), var(--color-brand-purple), var(--color-brand-pink))",
        }}
      />
    </nav>
  );
}
AppNav.displayName = "AppNav";
