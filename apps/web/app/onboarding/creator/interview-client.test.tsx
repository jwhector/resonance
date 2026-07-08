import type { UIMessage } from "ai";
import type { CreatorProfileDraft } from "@resonance/core";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useChat } from "@ai-sdk/react";
import { generateDraft } from "./actions";
import { InterviewClient } from "./interview-client";

// `useChat` owns real streaming; mock it so the wrapper's mapping + draft flow are testable in
// jsdom. `ai` (DefaultChatTransport) and the Server Actions are mocked for the same reason.
vi.mock("@ai-sdk/react", () => ({ useChat: vi.fn() }));
vi.mock("ai", () => ({ DefaultChatTransport: vi.fn() }));
vi.mock("./actions", () => ({ generateDraft: vi.fn(), commitProfile: vi.fn() }));

const sendMessage = vi.fn();
const regenerate = vi.fn();

function mockChat(messages: UIMessage[], status = "ready") {
  vi.mocked(useChat).mockReturnValue({
    messages,
    sendMessage,
    regenerate,
    status,
  } as unknown as ReturnType<typeof useChat>);
}

/** Reach into the mocked `useChat` call to fire the `onError` callback the component wired.
 * `onError` lives on the `ChatInit` arm of the `UseChatOptions` union, so narrow to read it. */
function fireStreamError(error = new Error("stream failed")) {
  const options = vi.mocked(useChat).mock.calls.at(-1)?.[0] as
    | { onError?: (error: Error) => void }
    | undefined;
  act(() => {
    options?.onError?.(error);
  });
}

function userMsg(text: string): UIMessage {
  return { id: "u1", role: "user", parts: [{ type: "text", text }] } as UIMessage;
}

const draft: CreatorProfileDraft = {
  nameOptions: [{ name: "Ada", description: "Her own name — personal and direct." }],
  headline: "Maker of small tools",
  bio: "I build things that fit the hand.",
  tags: ["tools", "craft"],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("InterviewClient", () => {
  it("shows the Weave welcome and disables generate until there is a user turn", () => {
    mockChat([]);
    render(<InterviewClient />);

    expect(screen.getByText(/Hi, I'm Weave/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /build my profile/i })).toBeDisabled();
  });

  it("renders the user transcript and enables generate once the user has spoken", () => {
    mockChat([userMsg("I make ceramic mugs")]);
    render(<InterviewClient />);

    expect(screen.getByText("I make ceramic mugs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /build my profile/i })).toBeEnabled();
  });

  it("calls generateDraft and swaps in the editable ProfileDraftPanels", async () => {
    vi.mocked(generateDraft).mockResolvedValueOnce(draft);
    mockChat([userMsg("I make ceramic mugs")]);
    render(<InterviewClient />);

    fireEvent.click(screen.getByRole("button", { name: /build my profile/i }));

    // Panels appear once the draft resolves.
    expect(await screen.findByText("Creator Name")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /good to go/i })).toBeInTheDocument();
    expect(generateDraft).toHaveBeenCalledWith({
      messages: [{ role: "user", content: "I make ceramic mugs" }],
    });
  });

  it("surfaces a stream failure and retries the last turn via regenerate", () => {
    mockChat([userMsg("I make ceramic mugs")]);
    render(<InterviewClient />);

    // No error surface until the stream actually fails.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireStreamError();

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/couldn't respond/i);

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(regenerate).toHaveBeenCalledTimes(1);

    // Retry clears the error surface.
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
