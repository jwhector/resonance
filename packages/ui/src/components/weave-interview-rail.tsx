import * as React from "react";
import type { InterviewMessage } from "@resonance/core";
import { cn } from "../lib/cn";
import { WeaveComposer } from "./weave-composer";

/**
 * WeaveInterviewRail — the streaming Weave onboarding-interview chat rail (Figma
 * `Weave/Sidebar` `1443:114245` / interview screen `1443:78282`, ADR-0012 / ADR-0013).
 *
 * A **controlled** chat surface: the parent (apps/web) owns the transcript and the AI
 * streaming; this component only renders `messages` and calls `onSend`. It does no data
 * fetching and never touches `@resonance/ai` (server-only) — it speaks the shared
 * `InterviewMessage` contract from `@resonance/core`. While `streaming`, it shows an
 * "in-progress assistant turn" typing indicator after the transcript. Composed from the
 * `WeaveComposer` (for the "Talk to Weave" box); tokens only.
 */
export interface WeaveInterviewRailProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onSubmit"
> {
  /** The full transcript so far, oldest first. The parent owns and updates this. */
  messages: InterviewMessage[];
  /** True while the assistant's reply is mid-stream — shows the typing indicator. */
  streaming?: boolean;
  /** Fires with the trimmed text when the user sends a turn. */
  onSend: (text: string) => void;
  /** Disables the composer (e.g. while awaiting the assistant). */
  disabled?: boolean;
}

/** The Weave brand mark shown in the rail header. Decorative — the adjacent word carries the name. */
function WeaveMark() {
  return <span aria-hidden="true" className="size-6 shrink-0 rounded-md bg-brand-gradient" />;
}

function MessageBubble({ message }: { message: InterviewMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      data-role={message.role}
      className={cn(
        "max-w-[85%] rounded-lg px-4 py-2 text-body-lg whitespace-pre-wrap",
        isUser
          ? "self-end bg-primary text-on-primary"
          : "self-start bg-surface-muted text-foreground",
      )}
    >
      <span className="sr-only">{isUser ? "You said: " : "Weave said: "}</span>
      {message.content}
    </div>
  );
}

/** Three pulsing dots standing in for the assistant's in-progress turn. */
function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="Weave is typing"
      className="flex max-w-[85%] items-center gap-1 self-start rounded-lg bg-surface-muted px-4 py-3"
    >
      <span className="size-1.5 animate-pulse rounded-full bg-subtle" />
      <span className="size-1.5 animate-pulse rounded-full bg-subtle" />
      <span className="size-1.5 animate-pulse rounded-full bg-subtle" />
    </div>
  );
}

export function WeaveInterviewRail({
  className,
  messages,
  streaming = false,
  onSend,
  disabled = false,
  ...props
}: WeaveInterviewRailProps) {
  return (
    <div
      role="region"
      aria-label="Weave interview"
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
      {...props}
    >
      {/* Header: Weave logo + wordmark, over a divider. */}
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <WeaveMark />
        <span className="text-heading-md font-medium text-foreground">Weave</span>
      </header>

      {/* Scrollable transcript. role="log" makes appended turns polite live-region updates. */}
      <div role="log" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5">
        {messages.map((message, index) => (
          <MessageBubble key={index} message={message} />
        ))}
        {streaming && <TypingIndicator />}
      </div>

      {/* Composer — controlled send-only; the parent appends the resulting turn. */}
      <div className="border-t border-border p-4">
        <WeaveComposer onSend={onSend} disabled={disabled} aria-label="Talk to Weave" />
      </div>
    </div>
  );
}
WeaveInterviewRail.displayName = "WeaveInterviewRail";
