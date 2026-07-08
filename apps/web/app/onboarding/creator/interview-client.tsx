"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import type { CreatorProfileDraft, InterviewMessage } from "@resonance/core";
import { Button, ProfileDraftPanels, WeaveInterviewRail } from "@resonance/ui";
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

/** A synthetic opener shown in the rail only — not part of the model transcript, so it is
 * never sent back to the interview route. */
const WELCOME: InterviewMessage = {
  role: "assistant",
  content:
    "Hi, I'm Weave. Tell me about what you make and who it's for, and I'll help shape your creator profile.",
};

export function InterviewClient() {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/onboarding/interview",
      // Send the shared contract the route validates, not raw UI messages.
      prepareSendMessagesRequest: ({ messages }) => ({
        body: { messages: uiMessagesToInterview(messages) },
      }),
    }),
  });

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

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <div className="h-[75vh] min-h-0 lg:sticky lg:top-10">
        <WeaveInterviewRail
          className="h-full"
          messages={[WELCOME, ...transcript]}
          streaming={streaming}
          onSend={(text) => sendMessage({ text })}
          disabled={streaming}
        />
      </div>

      <div className="flex flex-col gap-6">
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
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-surface p-8">
            <h2 className="text-2xl font-bold text-foreground">Ready when you are</h2>
            <p className="text-muted">
              Chat with Weave about your work. When you&apos;ve shared enough, generate a first
              draft of your creator profile — you can edit everything before publishing.
            </p>
            <Button type="button" onClick={handleGenerate} disabled={!hasUserTurn || generating}>
              {generating ? "Weaving your profile…" : "Weave, build my profile"}
            </Button>
          </div>
        )}

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
