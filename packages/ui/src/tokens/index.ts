/**
 * Design tokens as typed values, for use in TS/JS where CSS utilities don't reach
 * (e.g. canvas, charts, inline styles, generated emails). Keep in sync with
 * `../styles/theme.css` — that CSS file is the source of truth for the UI; this is a
 * typed mirror of the same values. Colors + typography are EXTRACTED from Figma. See ADR-0012.
 */

/** Neutral ramp — EXTRACTED from Figma. Inverted naming: gray0 = black … gray900 = white. */
export const gray = {
  0: "#000000",
  50: "#0a0a0a",
  100: "#141414",
  200: "#1e1e1e",
  300: "#2b2b2b",
  400: "#404040",
  500: "#868686",
  600: "#a6a6a6",
  700: "#cdcdcd",
  750: "#e6e6e6",
  800: "#f2f2f2",
  900: "#ffffff",
} as const;

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
  background: "#f2f2f2",
  backgroundSubtle: "#e6e6e6",
  surface: "#ffffff",
  surfaceMuted: "#f2f2f2",
  foreground: "#2b2b2b",
  muted: "#a6a6a6",
  subtle: "#868686",
  border: "#cdcdcd",
  borderStrong: "#a6a6a6",
  success: "#58b17a",
  warning: "#ffb347",
  danger: "#ff4d4d",
  info: "#3a7bff",
  accentViolet: "#7c5cff",
} as const;

/** Type scale — EXTRACTED from the Figma Fonts frame ([size, lineHeight] in px). */
export const typography = {
  fontFamily:
    '"Helvetica Neue", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
  weights: { regular: 400, medium: 500, bold: 700 },
  scale: {
    displayLg: { size: 60, lineHeight: 64, weight: 700 },
    displayMd: { size: 40, lineHeight: 48, weight: 700 },
    headingLg: { size: 28, lineHeight: 36, weight: 700 },
    headingMd: { size: 22, lineHeight: 30, weight: 500 },
    headingSm: { size: 16, lineHeight: 24, weight: 500 },
    button: { size: 16, lineHeight: 24, weight: 500 },
    bodyLg: { size: 16, lineHeight: 24, weight: 400 },
    bodyMd: { size: 14, lineHeight: 22, weight: 400 },
    caption: { size: 12, lineHeight: 18, weight: 500 },
    label: { size: 10, lineHeight: 16, weight: 700 },
  },
} as const;

export const radius = {
  sm: "6px",
  md: "8px", // EXTRACTED control radius (Figma inputs/buttons/tags/OTP/composer)
  lg: "16px",
  xl: "24px",
} as const;

export const brandGradient =
  "linear-gradient(90deg, #22d3ee 0%, #6366f1 25%, #a855f7 50%, #ec4899 70%, #f97316 88%, #facc15 100%)";

export type ColorTokens = typeof colors;
export type GrayScale = typeof gray;
export type Typography = typeof typography;
