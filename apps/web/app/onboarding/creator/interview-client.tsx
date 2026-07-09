"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import type { CreatorProfileDraft } from "@resonance/core";
import { AppNav, Button, ProfileDraftPanels, WeaveInterviewRail } from "@resonance/ui";
import { uiMessagesToInterview } from "../../../lib/interview-messages";
import { commitProfile, generateDraft } from "./actions";

/**
 * The interactive core of Creator Onboarding — the one client component that wires the design
 * system to the AI layer through the Server Actions + stream route:
 *
 *  - `useChat` (AI SDK v6) POSTs to `/api/onboarding/interview`. Its `DefaultChatTransport`
 *    maps the `UIMessage[]` transcript to the shared `InterviewMessage[]` contract before
 *    sending (`prepareSendMessagesRequest`), so the route validates one shape; the streamed
 *    reply flows back and `WeaveInterviewRail` renders the transcript + typing indicator.
 *  - "Weave, build my profile" calls the `generateDraft` action → an editable
 *    `CreatorProfileDraft`, held in local state and rendered by `ProfileDraftPanels`.
 *  - "Good to go" calls the `commitProfile` action, which persists + redirects.
 *
 * It never touches `@resonance/ai` directly (server-only) — only the contracts + actions.
 */

/** The Figma opener (interview screen `1443:78282`). Shown only in the start state — a
 * display-side prompt, never part of the model transcript, so it is never sent to the route. */
const START_PROMPT = {
  body:
    "Hi — I'm glad you're here.\n" +
    "I'll help you shape a clear version of your creator presence by learning a little about your work, your story, and the people who naturally resonate with it.\n" +
    "As we go, I'll also explain why certain questions matter so the process feels collaborative and transparent.\n" +
    "This usually takes about 5–10 minutes, and you don't need to have everything perfectly figured out.",
  question: "Would you like to begin?",
};

export function InterviewClient() {
  const router = useRouter();

  // A live streaming failure (e.g. the Gateway model throwing) would otherwise vanish silently
  // and read as a no-response. `onError` surfaces it so the user SEES the failure and can retry
  // (`regenerate` re-runs the last turn). See the stream-error surface in the rail column below.
  const [streamError, setStreamError] = React.useState(false);

  const { messages, sendMessage, status, regenerate } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/onboarding/interview",
      // Send the shared contract the route validates, not raw UI messages.
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { messages: uiMessagesToInterview(messages) },
      }),
    }),
    onError: () => setStreamError(true),
  });

  function handleSend(text: string) {
    // A fresh turn clears any prior stream error before the new stream starts.
    setStreamError(false);
    sendMessage({ text });
  }

  // "Yes let's begin" kicks the interview off with an opening turn so Weave asks its first
  // question; it leaves the start state the moment there is a user turn.
  function handleBegin() {
    handleSend("Yes, let's begin.");
  }

  // "I want do it later" backs out of onboarding to the home shell (deferred flow).
  function handleDeferLater() {
    router.push("/");
  }

  function handleRetryStream() {
    setStreamError(false);
    void regenerate();
  }

  const transcript = uiMessagesToInterview(messages);
  const streaming = status === "submitted" || status === "streaming";
  const hasUserTurn = transcript.some((message) => message.role === "user");

  // ProfileGen draft + its local, editable state (the parent owns it; the panels are controlled).
  const [draft, setDraft] = React.useState<CreatorProfileDraft | null>(null);
  const [selectedNameIndex, setSelectedNameIndex] = React.useState(0);
  const [headline, setHeadline] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);

  const [generating, setGenerating] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const result = await generateDraft({ messages: transcript });
      setDraft(result);
      setSelectedNameIndex(0);
      setHeadline(result.headline);
      setBio(result.bio);
      setTags(result.tags);
    } catch {
      setError("Weave couldn't build your profile yet. Share a little more, then try again.");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCommit() {
    if (!draft) return;
    setError(null);
    setSubmitting(true);
    try {
      const chosenName = draft.nameOptions[selectedNameIndex]?.name ?? draft.nameOptions[0]!.name;
      await commitProfile({ displayName: chosenName, headline, bio, tags });
      // On success `commitProfile` redirects to the new profile — nothing more to do here.
    } catch {
      setError("We couldn't publish your profile. Please try again.");
      setSubmitting(false);
    }
  }

  // Fold the local edits back into the draft shape the controlled panels render.
  const liveDraft: CreatorProfileDraft | null = draft ? { ...draft, headline, bio, tags } : null;

  // The start state (the Figma opener + begin/later controls) shows until the first user turn.
  const showStart = !draft && !hasUserTurn && !streaming;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <WeaveInterviewRail
          className="min-h-0 flex-1"
          // The draft screen (Figma `1473:81622`) shows just the woven draft — the prior
          // transcript is scrolled away — so suppress it here and let the draft lead.
          messages={liveDraft ? [] : transcript}
          streaming={streaming}
          onSend={handleSend}
          disabled={streaming}
          startPrompt={START_PROMPT}
          showStart={showStart}
          onBegin={handleBegin}
          onDeferLater={handleDeferLater}
        >
          {/* Inline in the conversation: the generate CTA before a draft, the draft after. */}
          {liveDraft ? (
            <ProfileDraftPanels
              draft={liveDraft}
              selectedNameIndex={selectedNameIndex}
              onSelectName={setSelectedNameIndex}
              onHeadlineChange={setHeadline}
              onBioChange={setBio}
              onTagsChange={setTags}
              onSubmit={handleCommit}
              submitting={submitting}
            />
          ) : hasUserTurn ? (
            <div className="flex flex-col items-start gap-2 pt-2">
              <p className="text-body-md text-muted">
                When you&apos;ve shared enough, Weave can draft your creator profile — you can edit
                everything before publishing.
              </p>
              <Button type="button" onClick={handleGenerate} disabled={generating}>
                {generating ? "Weaving your profile…" : "Weave, build my profile"}
              </Button>
            </div>
          ) : null}

          {streamError ? (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-lg border border-danger bg-surface p-4"
            >
              <p className="text-sm text-danger">
                Weave couldn&apos;t respond just now. Check your connection and try again.
              </p>
              <Button type="button" variant="outline" size="sm" onClick={handleRetryStream}>
                Try again
              </Button>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : null}
        </WeaveInterviewRail>
      </div>
    </div>
  );
}
