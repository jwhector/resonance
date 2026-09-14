import * as React from "react";
import { cn } from "../lib/cn";
import { Textarea } from "../primitives/textarea";
import { TextInput } from "../primitives/text-input";

/**
 * WeaveComposer — the "Talk to Weave" message box (Figma `Input/Wide` `434:1194`, verified;
 * hosted on the interview surface `1443:78283`).
 *
 * Shared internal composite (not part of the package's public surface): the streaming
 * interview rail uses it live, the generated-profile panel renders it *disabled*, and the
 * staged onboarding renderer uses it as the answer field for long-form stages. Calls
 * `onSend` — no transcript, no network. Submitting (Enter or the send button) trims and fires
 * `onSend`. When `disabled`, the field and send button are inert and `onSend` never fires.
 * Tokens only.
 *
 * **Uncontrolled by default** — it owns its draft and clears it after a send. Pass `value` +
 * `onValueChange` to control it instead; a controlled composer never clears itself, because
 * the owner decides whether a send succeeded (a rejected answer should stay in the box).
 *
 * Layout matches the Figma composer: a two-row field on a `surface-muted` fill — the
 * "Talk to Weave" input on top; an actions row beneath with **`+`** (attach) at the left
 * and **mic + send** at the right. The `+`/mic affordances stand in for attach/voice features
 * that do not exist yet and render inert; `showDeferredAffordances={false}` removes them
 * entirely, for surfaces that must not show a control implying a capability (ADR-0022).
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
  /** Controlled text. Omit to let the composer own its draft. */
  value?: string;
  /** Fires on every edit of a controlled composer. */
  onValueChange?: (value: string) => void;
  /** Maximum characters the field accepts. */
  maxLength?: number;
  /** Render a growing multi-line field (Enter sends, Shift+Enter breaks the line). */
  multiline?: boolean;
  /** Render the inert `+` and microphone placeholders. Defaults to true. */
  showDeferredAffordances?: boolean;
  className?: string;
}

/** A muted, inert affordance for a composer feature that does not exist yet (attach / voice). */
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
  value,
  onValueChange,
  maxLength,
  multiline = false,
  showDeferredAffordances = true,
  className,
}: WeaveComposerProps) {
  const [ownText, setOwnText] = React.useState("");
  const controlled = value !== undefined;
  const text = controlled ? value : ownText;
  const canSend = !disabled && text.trim().length > 0;

  function setText(next: string) {
    if (controlled) onValueChange?.(next);
    else setOwnText(next);
  }

  function submit() {
    if (!canSend) return;
    onSend?.(text.trim());
    if (!controlled) setOwnText("");
  }

  const fieldClass =
    "border-0 bg-transparent px-1 text-body-lg shadow-none focus-visible:ring-0 focus-visible:ring-offset-0";

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
      {multiline ? (
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          disabled={disabled}
          maxLength={maxLength}
          rows={1}
          className={cn("min-h-9 resize-none", fieldClass)}
        />
      ) : (
        <TextInput
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel ?? placeholder}
          disabled={disabled}
          maxLength={maxLength}
          className={cn("h-9", fieldClass)}
        />
      )}

      <div
        className={cn(
          "flex items-center",
          showDeferredAffordances ? "justify-between" : "justify-end",
        )}
      >
        {showDeferredAffordances && (
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
        )}

        <div className="flex items-center gap-1">
          {showDeferredAffordances && (
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
          )}

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
