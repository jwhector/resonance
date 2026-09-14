import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { StageRenderModel } from "@resonance/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OnboardingClientView } from "./onboarding";

const transitionCreatorOnboarding = vi.fn();
const push = vi.fn();

vi.mock("./actions", () => ({
  transitionCreatorOnboarding: (input: unknown) => transitionCreatorOnboarding(input),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import { OnboardingClient } from "./onboarding-client";

const opening: StageRenderModel = {
  stage: "opening",
  prompt: ["Hi, I’m glad you’re here.", "Would you like to begin?"],
  input: { kind: "none" },
  actions: [
    { id: "begin", label: "Yes let’s begin", emphasis: "secondary", availability: "available" },
    { id: "later", label: "I want to do it later", emphasis: "text", availability: "available" },
  ],
  progress: { stageNumber: 1, stageCount: 11 },
};

const offering: StageRenderModel = {
  stage: "offering",
  prompt: ["What do you want to share?"],
  input: {
    kind: "text",
    placeholder: "Talk to Weave",
    multiline: true,
    maxLength: 4000,
    required: true,
  },
  actions: [
    { id: "submit", label: "Yes I’m ready", emphasis: "primary", availability: "available" },
  ],
  progress: { stageNumber: 3, stageCount: 11 },
};

const completion: StageRenderModel = {
  stage: "completion",
  prompt: ["Your profile is live."],
  input: { kind: "none" },
  actions: [
    {
      id: "create_profile_image",
      label: "Create profile image",
      emphasis: "secondary",
      availability: "coming_soon",
    },
    { id: "finish", label: "Finish for now", emphasis: "text", availability: "available" },
  ],
  progress: { stageNumber: 11, stageCount: 11 },
};

function view(overrides: Partial<OnboardingClientView>): OnboardingClientView {
  return {
    status: "in_progress",
    render: opening,
    revision: 1,
    committedProfile: null,
    notice: null,
    profileId: null,
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("OnboardingClient", () => {
  it("sends the pressed action with the revision it was drawn from and renders the reply", async () => {
    transitionCreatorOnboarding.mockResolvedValueOnce(view({ render: offering, revision: 2 }));
    render(<OnboardingClient initial={view({})} />);

    fireEvent.click(screen.getByRole("button", { name: "Yes let’s begin" }));

    await screen.findByText("What do you want to share?");
    const [sent] = transitionCreatorOnboarding.mock.calls[0]!;
    expect(sent).toMatchObject({ action: "begin", expectedRevision: 1 });
    expect(sent.idempotencyKey).toEqual(expect.any(String));
    expect(sent).not.toHaveProperty("userId");
  });

  it("explains a rejection the server returned", async () => {
    render(<OnboardingClient initial={view({ notice: "generation_failed", render: offering })} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/couldn’t build your profile/i);
  });

  it("keeps the creator on the stage and says so when the request itself fails", async () => {
    transitionCreatorOnboarding.mockRejectedValueOnce(new Error("network"));
    render(<OnboardingClient initial={view({})} />);

    fireEvent.click(screen.getByRole("button", { name: "Yes let’s begin" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t save that/i);
    expect(screen.getByText("Would you like to begin?")).toBeInTheDocument();
  });

  it("leaves onboarding once “later” has been saved", async () => {
    transitionCreatorOnboarding.mockResolvedValueOnce(view({ revision: 2 }));
    render(<OnboardingClient initial={view({})} />);

    fireEvent.click(screen.getByRole("button", { name: "I want to do it later" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/"));
  });

  it("shows the published profile on the Onboarded rail and finishes to it", () => {
    render(
      <OnboardingClient
        initial={view({
          status: "completed",
          render: completion,
          revision: 9,
          profileId: "profile-1",
          committedProfile: {
            displayName: "Leaf & Kettle",
            headline: "Slow tea",
            bio: "Blends.",
            tags: ["tea"],
          },
        })}
      />,
    );

    expect(screen.getByRole("region", { name: "Your published profile" })).toHaveTextContent(
      "Leaf & Kettle",
    );
    fireEvent.click(screen.getByRole("button", { name: "Finish for now" }));
    expect(push).toHaveBeenCalledWith("/creator/profile-1");
    expect(transitionCreatorOnboarding).not.toHaveBeenCalled();
  });
});
