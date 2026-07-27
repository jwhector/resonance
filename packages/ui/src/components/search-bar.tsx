import * as React from "react";
import { cn } from "../lib/cn";
import { TextInput } from "../primitives/text-input";

/**
 * SearchBar — the member discovery search field (Figma `SearchBar/Filled` `1443:78158`,
 * `design/manifest/screens/12-search-creators`, ADR-0012).
 *
 * A **controlled** field: the parent owns the query string and this component only renders
 * it and reports edits. It does no searching, no debouncing, and no data fetching — submit
 * (Enter, or the implicit form submit) fires `onSearch`, and the clear (×) affordance the
 * design draws fires `onValueChange("")` plus the optional `onClear`.
 *
 * Geometry is the frame's: 56px tall, 8px radius, 1px border, 16px padding, an 8px gap
 * between the leading magnifier, the query text, and the trailing clear control. Width is
 * the caller's (the design's 604px column belongs to the page, not the field).
 *
 * Accessibility is the native `<input type="search">`'s — inside a `role="search"` landmark,
 * with a visually hidden label so the field is nameable without the design showing one. The
 * platform's own webkit clear decoration is suppressed so there is exactly one × control.
 */
export interface SearchBarProps extends Omit<
  React.FormHTMLAttributes<HTMLFormElement>,
  "onChange" | "onSubmit"
> {
  /** The current query. The parent owns and updates it. */
  value: string;
  /** Fires with the next query on every edit (and with `""` when cleared). */
  onValueChange: (value: string) => void;
  /** Fires with the current query when the field is submitted (Enter). */
  onSearch?: (value: string) => void;
  /** Fires after the clear (×) control empties the field, for resetting results. */
  onClear?: () => void;
  /**
   * Placeholder copy. The Creators frame shows a filled field, so it gives no placeholder;
   * the sibling `Member/Search/Home` right-rail bar (`1443:78102`) reads "Search on
   * Resonance", which is the only placeholder string the design supplies. `PROVISIONAL`
   * for this screen.
   */
  placeholder?: string;
  /** Accessible name for the field and its landmark. */
  label?: string;
  /** Disables the field and the clear control. */
  disabled?: boolean;
}

/** `Icon/Search`, 24×24 leading. */
function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-6 shrink-0 text-foreground"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function SearchBar({
  className,
  value,
  onValueChange,
  onSearch,
  onClear,
  placeholder = "Search on Resonance",
  label = "Search Resonance",
  disabled = false,
  ...props
}: SearchBarProps) {
  const inputId = React.useId();

  return (
    <form
      role="search"
      aria-label={label}
      className={cn("w-full", className)}
      onSubmit={(event) => {
        event.preventDefault();
        onSearch?.(value);
      }}
      {...props}
    >
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div
        className={cn(
          "flex h-14 w-full items-center gap-2 rounded-md border border-border bg-surface px-4",
          "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        )}
      >
        <SearchIcon />
        <TextInput
          id={inputId}
          type="search"
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          onChange={(event) => onValueChange(event.target.value)}
          className={cn(
            "h-6 flex-1 rounded-none border-0 bg-transparent p-0 text-body-lg text-foreground shadow-none",
            "focus-visible:ring-0 focus-visible:ring-offset-0",
            // One × only: suppress the platform's own search-field clear decoration.
            "[&::-webkit-search-cancel-button]:appearance-none",
          )}
        />
        {value.length > 0 && (
          <button
            type="button"
            aria-label="Clear search"
            disabled={disabled}
            onClick={() => {
              onValueChange("");
              onClear?.();
            }}
            className={cn(
              "grid size-4 shrink-0 place-items-center rounded-sm text-muted transition-colors",
              "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              "disabled:pointer-events-none disabled:opacity-50",
            )}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-4"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </form>
  );
}
SearchBar.displayName = "SearchBar";
