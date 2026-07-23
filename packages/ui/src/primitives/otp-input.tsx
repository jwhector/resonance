import * as React from "react";
import { cn } from "../lib/cn";
import { backspaceOtp, clampFocus, joinOtp, padOtp, typeOtp } from "../lib/otp";

/**
 * OtpInput — a row of single-character cells for one-time codes (Figma `InputList`,
 * ADR-0012). Controlled: parent holds the `value` string, we render `length` native
 * inputs and manage focus + keyboard navigation (type advances, Backspace retreats,
 * arrows move, paste distributes). `onComplete` fires when every cell is filled.
 * Native inputs keep focus/ARIA correct; tokens only. Behaviour lives in `lib/otp`.
 */
export interface OtpInputProps {
  /** Current code; may be shorter than `length` while entering. */
  value: string;
  /** Fires with the full concatenated code on every change. */
  onChange: (value: string) => void;
  /** Number of cells. */
  length?: number;
  /** Fires once when all cells are filled. */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Accessible name for the cell group. */
  "aria-label"?: string;
  /** Base id; cells derive `${id}-${n}`. */
  id?: string;
}

export function OtpInput({
  value,
  onChange,
  length = 6,
  onComplete,
  disabled,
  autoFocus,
  "aria-label": ariaLabel = "Verification code",
  id,
}: OtpInputProps) {
  const generatedId = React.useId();
  const baseId = id ?? generatedId;
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);
  const cells = padOtp(value, length);

  const focusCell = (index: number) => {
    refs.current[clampFocus(index, length)]?.focus();
  };

  const commit = (nextCells: string[], focus: number) => {
    const nextValue = joinOtp(nextCells);
    onChange(nextValue);
    focusCell(focus);
    if (nextCells.every((cell) => cell !== "")) onComplete?.(nextValue);
  };

  return (
    <div role="group" aria-label={ariaLabel} className="flex gap-2">
      {cells.map((cell, index) => (
        <input
          key={index}
          ref={(node) => {
            refs.current[index] = node;
          }}
          id={`${baseId}-${index}`}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && index === 0}
          maxLength={1}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          value={cell}
          onChange={(event) => {
            const { cells: nextCells, focus } = typeOtp(cells, index, event.target.value);
            commit(nextCells, focus);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace") {
              event.preventDefault();
              const { cells: nextCells, focus } = backspaceOtp(cells, index);
              commit(nextCells, focus);
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              focusCell(index - 1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              focusCell(index + 1);
            }
          }}
          onPaste={(event) => {
            event.preventDefault();
            const pasted = event.clipboardData.getData("text");
            const { cells: nextCells, focus } = typeOtp(cells, index, pasted);
            commit(nextCells, focus);
          }}
          className={cn(
            // Figma `InputList` cell: 36×40, 8px radius, 1px gray-700 border.
            "h-10 w-9 rounded-md border border-border bg-surface text-center text-lg font-semibold text-foreground shadow-xs transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
      ))}
    </div>
  );
}
OtpInput.displayName = "OtpInput";
