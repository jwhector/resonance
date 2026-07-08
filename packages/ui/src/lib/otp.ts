/**
 * Pure state helpers for the OTP input. Kept DOM-free so the keyboard behaviour
 * (type, replace, paste, backspace) is unit-testable without a browser environment.
 * Cells are a fixed-length array of single characters ("" = empty).
 */

/** Only digits are accepted in an OTP cell. */
export function sanitizeOtp(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Split a value string into a fixed-length cell array, padding with "". */
export function padOtp(value: string, length: number): string[] {
  const cells = sanitizeOtp(value).slice(0, length).split("");
  while (cells.length < length) cells.push("");
  return cells;
}

/** Concatenate cells back into a value string (trailing empties collapse away). */
export function joinOtp(cells: string[]): string {
  return cells.join("");
}

export interface OtpTransition {
  cells: string[];
  /** Cell index that should receive focus after the change. */
  focus: number;
}

/**
 * Apply typed/pasted input at `index`. A single char fills that cell and advances;
 * a multi-char string (paste) is distributed across cells from `index`; empty input
 * clears the cell in place.
 */
export function typeOtp(cells: string[], index: number, input: string): OtpTransition {
  const length = cells.length;
  const digits = sanitizeOtp(input);
  const next = [...cells];

  if (digits.length === 0) {
    next[index] = "";
    return { cells: next, focus: index };
  }

  let cursor = index;
  for (const digit of digits) {
    if (cursor >= length) break;
    next[cursor] = digit;
    cursor += 1;
  }
  return { cells: next, focus: Math.min(cursor, length - 1) };
}

/**
 * Backspace at `index`: clear the current cell if filled, otherwise step back and
 * clear the previous cell.
 */
export function backspaceOtp(cells: string[], index: number): OtpTransition {
  const next = [...cells];
  if (next[index]) {
    next[index] = "";
    return { cells: next, focus: index };
  }
  const prev = Math.max(index - 1, 0);
  next[prev] = "";
  return { cells: next, focus: prev };
}

/** Clamp a target focus index into range. */
export function clampFocus(index: number, length: number): number {
  return Math.min(Math.max(index, 0), length - 1);
}
