import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The design system's type scale, as `text-*` utility suffixes (`theme.css` `--text-*`).
 *
 * tailwind-merge ships knowing Tailwind's stock font sizes (`text-sm`, `text-base`, …) and
 * classifies **every other** `text-<something>` as a text *colour*. Our scale is entirely
 * custom (ADR-0012), so without this list `text-heading-md` and `text-muted` look like two
 * competing colours and the merge drops the first — silently deleting the font size, and,
 * worse, deleting a real colour when the order runs the other way (`text-on-primary` +
 * `text-body-lg` resolved to no colour at all, turning the brand button's white label dark).
 *
 * Keep in sync with the `--text-*` tokens in `styles/theme.css`.
 */
const FONT_SIZES = [
  "display-lg",
  "display-md",
  "heading-lg",
  "heading-md",
  "heading-sm",
  "body-lg",
  "body-md",
  "caption",
  "label",
] as const;

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: [...FONT_SIZES] }] } },
});

/**
 * Merge class names with Tailwind-aware conflict resolution.
 * The one allowed way to compose classes across the design system.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
