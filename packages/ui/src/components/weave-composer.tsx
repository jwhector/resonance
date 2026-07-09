import * as React from "react";
import { cn } from "../lib/cn";
import { TextInput } from "../primitives/text-input";

/**
 * WeaveComposer — the "Talk to Weave" message box (Figma interview surface `1443:78283`).
 *
 * Shared internal composite (not part of the package's public surface): the streaming
 * interview rail uses it live, and the generated-profile panel renders it *disabled* to
 * stand in for the deferred conversational-refine loop. Owns only its own draft text and
 * calls `onSend` — no transcript, no network. Submitting (Enter or the send button)
 * trims, fires `onSend`, and clears. When `disabled`, the field and send button are
 * inert and `onSend` never fires. Tokens only.
 *
 * Layout matches the Figma composer: a two-row field on a `surface-muted` fill — the
 * "Talk to Weave" input on top; an actions row beneath with **`+`** (attach) at the left
 * and **mic + send** at the right. The `+`/mic affordances are placeholders for deferred
 * attach/voice features (seed resonance-216c) and render inert.
 */
export interface WeaveComposerProps {
  /** Fires with the trimmed text when the user submits. Omit for a display-only box. */
  onSend?: (text: string) => void;
  /** Renders the composer visibly inert (the deferred refine loop uses this). */
  disabled?: boolean;
  /** Field placeholder. */
  placeholder?: string;
  /** Accessible label for the field (defaults to the placeholder). */
  "aria-label"?: string;
  className?: string;
}

/** A muted, inert affordance for a deferred composer feature (attach / voice) — resonance-216c. */
function ComposerAction({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled
      className="grid size-8 shrink-0 place-items-center rounded-md text-subtle"
    >
      {children}
    </button>
  );
}

export function WeaveComposer({
  onSend,
  disabled = false,
  placeholder = "Talk to Weave",
  "aria-label": ariaLabel,
  className,
}: WeaveComposerProps) {
  const [text, setText] = React.useState("");
  const canSend = !disabled && text.trim().length > 0;

  function submit() {
    if (!canSend) return;
    onSend?.(text.trim());
    setText("");
  }

  return (
    <form
      className={cn(
        "flex flex-col gap-1 rounded-lg bg-surface-muted px-4 py-3",
        disabled && "opacity-60",
        className,
      )}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <TextInput
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        disabled={disabled}
        className="h-9 border-0 bg-transparent px-1 text-body-lg shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />

      <div className="flex items-center justify-between">
        <ComposerAction label="Add attachment">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
            className="size-5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </ComposerAction>

        <div className="flex items-center gap-1">
          <ComposerAction label="Voice input">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="size-5"
            >
              <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4" />
            </svg>
          </ComposerAction>

          <button
            type="submit"
            aria-label="Send to Weave"
            disabled={!canSend}
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              canSend
                ? "bg-primary text-on-primary hover:bg-primary-strong"
                : "bg-border text-subtle",
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
              className="size-5"
            >
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
        </div>
      </div>
    </form>
  );
}
WeaveComposer.displayName = "WeaveComposer";
