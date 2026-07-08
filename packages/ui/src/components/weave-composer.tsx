import * as React from "react";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { TextInput } from "../primitives/text-input";

/**
 * WeaveComposer — the "Talk to Weave" message box (Figma `Input` `434:1194`).
 *
 * Shared internal composite (not part of the package's public surface): the streaming
 * interview rail uses it live, and the generated-profile panel renders it *disabled* to
 * stand in for the deferred conversational-refine loop. Owns only its own draft text and
 * calls `onSend` — no transcript, no network. Submitting (Enter or the send button)
 * trims, fires `onSend`, and clears. When `disabled`, the field and send button are
 * inert and `onSend` never fires. Tokens only.
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
        "flex items-center gap-2 rounded-lg border border-border bg-surface-muted p-2",
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
        className="border-0 bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <Button
        type="submit"
        size="icon"
        aria-label="Send to Weave"
        disabled={!canSend}
        className="size-9 shrink-0"
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
      </Button>
    </form>
  );
}
WeaveComposer.displayName = "WeaveComposer";
