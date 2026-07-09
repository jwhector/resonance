import * as React from "react";
import type { InterviewMessage } from "@resonance/core";
import { cn } from "../lib/cn";
import { Button } from "../primitives/button";
import { WeaveComposer } from "./weave-composer";

/**
 * WeaveInterviewRail — the full-bleed Weave onboarding-interview surface (Figma interview
 * screen `1443:78282`, `Weave/Sidebar` `1443:78283`, ADR-0012 / ADR-0013).
 *
 * A **controlled** conversation surface: the parent (apps/web) owns the transcript and the
 * AI streaming; this component only renders `messages` and calls `onSend`. It does no data
 * fetching and never touches `@resonance/ai` (server-only) — it speaks the shared
 * `InterviewMessage` contract from `@resonance/core`. It renders as one full-bleed panel
 * (no card chrome), not a floating card: a header (circular Weave mark + wordmark + a
 * collapse chevron), a prose transcript (assistant turns are flowing prose, not bubbles),
 * and the `WeaveComposer` pinned at the bottom.
 *
 * In the **start state** (`showStart`, before the first user turn) it renders the Figma
 * opener (`startPrompt`) followed by the "Yes let's begin" / "I want do it later" controls
 * in place of an empty transcript. The `children` slot renders after the transcript (the
 * app uses it for the inline "build my profile" CTA and the generated draft). Tokens only.
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
  /** The Figma opener shown in the start state: prose `body` + a bold closing `question`. */
  startPrompt?: { body: string; question: string };
  /** Render the start state (the opener + begin/later controls) instead of the transcript. */
  showStart?: boolean;
  /** Fires when the user chooses "Yes let's begin". */
  onBegin?: () => void;
  /** Fires when the user chooses "I want do it later". */
  onDeferLater?: () => void;
  /** Show the bottom composer. Default true; the draft phase hides it (it supplies its own). */
  showComposer?: boolean;
  /** Rendered after the transcript, inside the scroll area (inline CTA / generated draft). */
  children?: React.ReactNode;
}

/** The circular Weave mark: a spectrum ring around a light center. Placeholder for the real asset (resonance-cbbb). */
function WeaveMark() {
  return (
    <span
      aria-hidden="true"
      className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-gradient"
    >
      <span className="size-3 rounded-full bg-surface" />
    </span>
  );
}

function Message({ message }: { message: InterviewMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      data-role={message.role}
      className={cn(
        "whitespace-pre-wrap text-body-lg text-foreground",
        // Assistant turns are flowing prose; user turns get a restrained right-aligned
        // surface tint to mark the speaker (final user-turn styling: seed resonance-216c).
        isUser
          ? "max-w-[75%] self-end rounded-lg bg-surface-muted px-4 py-2"
          : "max-w-3xl self-start",
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
      className="flex max-w-[75%] items-center gap-1 self-start"
    >
      <span className="size-1.5 animate-pulse rounded-full bg-subtle" />
      <span className="size-1.5 animate-pulse rounded-full bg-subtle" />
      <span className="size-1.5 animate-pulse rounded-full bg-subtle" />
    </div>
  );
}

function StartState({
  prompt,
  onBegin,
  onDeferLater,
}: {
  prompt: { body: string; question: string };
  onBegin?: () => void;
  onDeferLater?: () => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <p className="whitespace-pre-line text-body-lg text-foreground">
        {prompt.body}
        {"\n"}
        <span className="font-bold">{prompt.question}</span>
      </p>
      <div className="flex flex-col items-start gap-3">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={onBegin}
          className="border-gray-750 font-medium"
        >
          Yes let&apos;s begin
        </Button>
        <button
          type="button"
          onClick={onDeferLater}
          className="text-body-lg font-medium text-primary hover:underline"
        >
          I want do it later
        </button>
      </div>
    </div>
  );
}

export function WeaveInterviewRail({
  className,
  messages,
  streaming = false,
  onSend,
  disabled = false,
  startPrompt,
  showStart = false,
  onBegin,
  onDeferLater,
  showComposer = true,
  children,
  ...props
}: WeaveInterviewRailProps) {
  return (
    <div
      role="region"
      aria-label="Weave interview"
      className={cn("flex h-full min-h-0 flex-col overflow-hidden bg-surface", className)}
      {...props}
    >
      {/* Header: circular Weave mark + wordmark, and a collapse chevron, over a faint divider. */}
      <header className="flex items-center justify-between border-b border-gray-750 px-6 py-4">
        <div className="flex items-center gap-3">
          <WeaveMark />
          <span className="text-heading-md font-medium text-foreground">Weave</span>
        </div>
        <button
          type="button"
          disabled
          aria-label="Collapse Weave"
          title="Collapse Weave"
          className="grid size-8 place-items-center rounded-md text-subtle"
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
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </header>

      {/* Scrollable conversation. role="log" makes appended turns polite live-region updates. */}
      <div role="log" className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-10 py-8">
        {showStart && startPrompt ? (
          <StartState prompt={startPrompt} onBegin={onBegin} onDeferLater={onDeferLater} />
        ) : (
          <>
            {messages.map((message, index) => (
              <Message key={index} message={message} />
            ))}
            {streaming && <TypingIndicator />}
            {children}
          </>
        )}
      </div>

      {/* Composer — controlled send-only; the parent appends the resulting turn. */}
      {showComposer && (
        <div className="px-10 pb-8 pt-2">
          <WeaveComposer onSend={onSend} disabled={disabled} aria-label="Talk to Weave" />
        </div>
      )}
    </div>
  );
}
WeaveInterviewRail.displayName = "WeaveInterviewRail";
