/**
 * Design tokens as typed values, for use in TS/JS where CSS utilities don't reach
 * (e.g. canvas, charts, inline styles, generated emails). Keep in sync with
 * `../styles/theme.css` — that CSS file is the source of truth for the UI; this is a
 * typed mirror of the same values. See ADR-0012.
 */
export const colors = {
  brand: {
    cyan: "#22d3ee",
    indigo: "#6366f1",
    purple: "#a855f7",
    pink: "#ec4899",
    orange: "#f97316",
    yellow: "#facc15",
  },
  primary: "#a855f7",
  primaryStrong: "#6366f1",
  onPrimary: "#ffffff",
  background: "#ffffff",
  surface: "#ffffff",
  foreground: "#0f172a",
  muted: "#475569",
  subtle: "#94a3b8",
  border: "#e2e8f0",
  success: "#22c55e",
  warning: "#f97316",
  danger: "#ef4444",
  info: "#6366f1",
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "16px",
  xl: "24px",
} as const;

export const brandGradient =
  "linear-gradient(90deg, #22d3ee 0%, #6366f1 25%, #a855f7 50%, #ec4899 70%, #f97316 88%, #facc15 100%)";

export type ColorTokens = typeof colors;
