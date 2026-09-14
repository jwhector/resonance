import { StageRenderModelSchema, type StageRenderModel } from "@resonance/core";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CreatorOnboardingStage } from "./creator-onboarding-stage";

/** Every fixture goes through the real contract, so a test cannot draw a model no provider could emit. */
function model(raw: unknown): StageRenderModel {
  return StageRenderModelSchema.parse(raw);
}

const opening = model({
  stage: "opening",
  prompt: ["Beautiful — we can start gently.", "Would you like to begin?"],
  input: { kind: "none" },
  actions: [
    { id: "begin", label: "Yes let’s begin", emphasis: "secondary", availability: "available" },
    { id: "later", label: "I want to do it later", emphasis: "text", availability: "available" },
  ],
  progress: { stageNumber: 1, stageCount: 11 },
});

const creatorName = model({
  stage: "creator_name",
  prompt: [
    "Perfect.",
    "To start — what’s the name of your project, business, or creative practice?",
  ],
  input: {
    kind: "text",
    placeholder: "Type your business or project name",
    multiline: false,
    maxLength: 120,
    required: true,
  },
  actions: [
    { id: "submit", label: "Good to go", emphasis: "primary", availability: "available" },
    {
      id: "request_help",
      label: "I’d like help",
      emphasis: "secondary",
      availability: "available",
    },
    { id: "skip", label: "Skip", emphasis: "text", availability: "available" },
  ],
  progress: { stageNumber: 2, stageCount: 11 },
});

const offering = model({
  stage: "offering",
  prompt: ["What do you want to offer or share?"],
  input: {
    kind: "text",
    placeholder: "Talk to Weave",
    multiline: true,
    maxLength: 4000,
    required: false,
  },
  actions: [
    { id: "submit", label: "Yes I’m ready", emphasis: "primary", availability: "available" },
    { id: "skip", label: "Skip", emphasis: "text", availability: "available" },
  ],
  progress: { stageNumber: 3, stageCount: 11 },
});

const expression = model({
  stage: "expression_style",
  prompt: ["What overall expression style feels closest to what you’re creating?"],
  input: {
    kind: "choice",
    allowCustomText: true,
    options: [
      { id: "calm_clean", label: "Calm & Clean" },
      { id: "dreamy_reflective", label: "Dreamy & Reflective" },
      { id: "bold_expressive", label: "Bold & Expressive" },
      { id: "custom", label: "Custom direction" },
    ],
  },
  actions: [
    { id: "submit", label: "Good to go", emphasis: "primary", availability: "available" },
    {
      id: "choose_for_me",
      label: "Choose for me",
      emphasis: "secondary",
      availability: "available",
    },
    { id: "skip", label: "Skip", emphasis: "text", availability: "available" },
  ],
  progress: { stageNumber: 8, stageCount: 11 },
});

const foundation = model({
  stage: "foundation",
  prompt: ["Here is your first profile foundation.", "Nothing here is permanent."],
  input: {
    kind: "foundation",
    draft: {
      nameOptions: [
        {
          name: "Moonroot Studio",
          description: "Reflective herbal and dream-centered experiences.",
        },
        { name: "Isithunywa", description: "Plant-based dreamwork and intentional spaces." },
        { name: "Night Bloom Collective", description: "Quiet herbal gatherings." },
      ],
      headline: "Dreamwork and herbal reflection for slower inner connection.",
      bio: "Explores dreamwork, herbal blends, and reflective sessions.",
      tags: ["Dreamwork", "Tea Blends", "Rituals"],
    },
  },
  actions: [{ id: "submit", label: "Good to go", emphasis: "primary", availability: "available" }],
  progress: { stageNumber: 10, stageCount: 11 },
});

const completion = model({
  stage: "completion",
  prompt: ["Your profile is now live on Resonance.", "From here, I can also help you:"],
  input: { kind: "none" },
  actions: [
    {
      id: "create_profile_image",
      label: "Create profile image",
      emphasis: "secondary",
      availability: "coming_soon",
    },
    {
      id: "create_cover_image",
      label: "Create cover image",
      emphasis: "secondary",
      availability: "coming_soon",
    },
    {
      id: "refine_profile",
      label: "Refine profile",
      emphasis: "secondary",
      availability: "coming_soon",
    },
    { id: "finish", label: "Finish for now", emphasis: "text", availability: "available" },
  ],
  progress: { stageNumber: 11, stageCount: 11 },
});

function setup(stage: StageRenderModel, extra: { pending?: boolean; error?: string } = {}) {
  const onAction = vi.fn();
  const onFinish = vi.fn();
  const utils = render(
    <CreatorOnboardingStage model={stage} onAction={onAction} onFinish={onFinish} {...extra} />,
  );
  return { onAction, onFinish, ...utils };
}

describe("CreatorOnboardingStage — shared shell", () => {
  it("renders the Weave surface, the prompt as prose, and announces progress", () => {
    setup(opening);
    expect(screen.getByRole("region", { name: "Weave" })).toBeInTheDocument();
    expect(screen.getByText("Beautiful — we can start gently.")).toBeInTheDocument();
    // The question line is the emphasised one.
    expect(screen.getByText("Would you like to begin?")).toHaveClass("font-bold");
    expect(screen.getByText("Step 1 of 11")).toHaveClass("sr-only");
  });

  it("fires input-less actions with no payload", () => {
    const { onAction } = setup(opening);
    fireEvent.click(screen.getByRole("button", { name: "Yes let’s begin" }));
    fireEvent.click(screen.getByRole("button", { name: "I want to do it later" }));
    expect(onAction).toHaveBeenNthCalledWith(1, "begin");
    expect(onAction).toHaveBeenNthCalledWith(2, "later");
  });

  it("never renders the composer's + or microphone, nor Revise with Weave", () => {
    for (const stage of [opening, creatorName, offering, expression, foundation, completion]) {
      const { unmount } = setup(stage);
      expect(screen.queryByRole("button", { name: "Add attachment" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Voice input" })).not.toBeInTheDocument();
      expect(screen.queryByText(/Revise with Weave/i)).not.toBeInTheDocument();
      unmount();
    }
  });

  it("disables every action and reports busy while pending, and shows an error as an alert", () => {
    const { onAction } = setup(opening, { pending: true, error: "Something went wrong." });
    expect(screen.getByRole("region", { name: "Weave" })).toHaveAttribute("aria-busy", "true");
    const begin = screen.getByRole("button", { name: "Yes let’s begin" });
    expect(begin).toBeDisabled();
    fireEvent.click(begin);
    expect(onAction).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong.");
  });
});

describe("CreatorOnboardingStage — text input", () => {
  it("disables submit while a required answer is empty, then submits the trimmed text", () => {
    const { onAction } = setup(creatorName);
    const field = screen.getByRole("textbox", { name: /what’s the name of your project/i });
    const submit = screen.getByRole("button", { name: "Good to go" });

    expect(field).toHaveAttribute("placeholder", "Type your business or project name");
    expect(field).toHaveAttribute("maxLength", "120");
    expect(field).toBeRequired();
    expect(submit).toBeDisabled();

    fireEvent.change(field, { target: { value: "   " } });
    expect(submit).toBeDisabled();

    fireEvent.change(field, { target: { value: "  Moonroot Studio " } });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(onAction).toHaveBeenCalledWith("submit", { kind: "text", text: "Moonroot Studio" });
  });

  it("submits a single-line answer on Enter", () => {
    const { onAction } = setup(creatorName);
    const field = screen.getByRole("textbox", { name: /what’s the name/i });
    fireEvent.change(field, { target: { value: "Moonroot" } });
    fireEvent.submit(field.closest("form")!);
    expect(onAction).toHaveBeenCalledWith("submit", { kind: "text", text: "Moonroot" });
  });

  it("keeps Skip and help available without an answer", () => {
    const { onAction } = setup(creatorName);
    fireEvent.click(screen.getByRole("button", { name: "Skip" }));
    fireEvent.click(screen.getByRole("button", { name: "I’d like help" }));
    expect(onAction).toHaveBeenNthCalledWith(1, "skip");
    expect(onAction).toHaveBeenNthCalledWith(2, "request_help");
  });

  it("takes long-form answers in the bottom composer, via send or the submit action", () => {
    const { onAction } = setup(offering);
    const composer = screen.getByRole("textbox", { name: "Talk to Weave" });
    expect(composer.tagName).toBe("TEXTAREA");
    expect(composer).toHaveAttribute("maxLength", "4000");

    // Optional stage: the submit action works empty (no payload), sending does not.
    expect(screen.getByRole("button", { name: "Send to Weave" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Yes I’m ready" })).toBeEnabled();

    fireEvent.change(composer, { target: { value: "Herbal tea blends and dream sessions" } });
    fireEvent.click(screen.getByRole("button", { name: "Send to Weave" }));
    expect(onAction).toHaveBeenLastCalledWith("submit", {
      kind: "text",
      text: "Herbal tea blends and dream sessions",
    });
    // The owner decides whether the answer landed; the composer keeps it until the model moves on.
    expect(composer).toHaveValue("Herbal tea blends and dream sessions");

    fireEvent.click(screen.getByRole("button", { name: "Yes I’m ready" }));
    expect(onAction).toHaveBeenLastCalledWith("submit", {
      kind: "text",
      text: "Herbal tea blends and dream sessions",
    });
  });

  it("submits an optional stage left empty with no payload", () => {
    const { onAction } = setup(offering);
    fireEvent.click(screen.getByRole("button", { name: "Yes I’m ready" }));
    expect(onAction).toHaveBeenCalledWith("submit", undefined);
  });

  it("starts the next question from an empty answer", () => {
    const onAction = vi.fn();
    const { rerender } = render(
      <CreatorOnboardingStage model={creatorName} onAction={onAction} onFinish={() => {}} />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Moonroot" } });
    rerender(<CreatorOnboardingStage model={offering} onAction={onAction} onFinish={() => {}} />);
    expect(screen.getByRole("textbox", { name: "Talk to Weave" })).toHaveValue("");
  });
});

describe("CreatorOnboardingStage — expression choices", () => {
  it("is a radio group whose submit waits for a choice", () => {
    const { onAction } = setup(expression);
    const group = screen.getByRole("radiogroup", { name: /expression style/i });
    expect(within(group).getAllByRole("radio")).toHaveLength(4);
    const submit = screen.getByRole("button", { name: "Good to go" });
    expect(submit).toBeDisabled();

    fireEvent.click(screen.getByRole("radio", { name: "Dreamy & Reflective" }));
    expect(screen.getByRole("radio", { name: "Dreamy & Reflective" })).toBeChecked();
    fireEvent.click(submit);
    expect(onAction).toHaveBeenCalledWith("submit", {
      kind: "choice",
      choiceId: "dreamy_reflective",
    });
  });

  it("moves the selection with the arrow keys", async () => {
    setup(expression);
    const calm = screen.getByRole("radio", { name: "Calm & Clean" });
    const dreamy = screen.getByRole("radio", { name: "Dreamy & Reflective" });

    fireEvent.click(calm);
    act(() => calm.focus());
    fireEvent.keyDown(calm, { key: "ArrowDown" });

    // Radix moves roving focus on the next tick.
    await waitFor(() => expect(dreamy).toHaveFocus());
    expect(dreamy).toBeChecked();
    expect(calm).not.toBeChecked();
  });

  it("reveals a text field for the custom direction and submits its text", () => {
    const { onAction } = setup(expression);
    expect(screen.queryByRole("textbox", { name: "Custom direction" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Custom direction" }));
    const field = screen.getByRole("textbox", { name: "Custom direction" });
    fireEvent.change(field, { target: { value: " Earthy and nocturnal " } });
    fireEvent.click(screen.getByRole("button", { name: "Good to go" }));

    expect(onAction).toHaveBeenCalledWith("submit", {
      kind: "choice",
      choiceId: "custom",
      customText: "Earthy and nocturnal",
    });
  });

  it("offers no custom field when the model does not allow custom text", () => {
    const noCustom = model({
      ...expression,
      input: { ...expression.input, allowCustomText: false },
    });
    setup(noCustom);
    fireEvent.click(screen.getByRole("radio", { name: "Custom direction" }));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("fires Choose for me without a payload", () => {
    const { onAction } = setup(expression);
    fireEvent.click(screen.getByRole("button", { name: "Choose for me" }));
    expect(onAction).toHaveBeenCalledWith("choose_for_me");
  });
});

describe("CreatorOnboardingStage — profile foundation", () => {
  it("commits exactly the selected and edited values", () => {
    const { onAction } = setup(foundation);

    expect(screen.getByRole("radio", { name: /Moonroot Studio/ })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: /Night Bloom Collective/ }));

    fireEvent.change(screen.getByRole("textbox", { name: "Headline" }), {
      target: { value: "Quiet herbal gatherings for slower rhythms." },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "About" }), {
      target: { value: "Night Bloom Collective hosts reflective tea evenings." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove Tea Blends" }));

    const newTag = screen.getByRole("textbox", { name: "New search keyword" });
    fireEvent.change(newTag, { target: { value: " Night Rituals " } });
    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));
    expect(newTag).toHaveValue("");

    // A duplicate in another casing is not added twice; Enter adds too.
    fireEvent.change(newTag, { target: { value: "dreamwork" } });
    fireEvent.keyDown(newTag, { key: "Enter" });
    fireEvent.change(newTag, { target: { value: "Herbalism" } });
    fireEvent.keyDown(newTag, { key: "Enter" });

    const keywords = screen.getByRole("list", { name: "Search Keywords" });
    expect(
      within(keywords)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Dreamwork", "Rituals", "Night Rituals", "Herbalism"]);

    fireEvent.click(screen.getByRole("button", { name: "Good to go" }));
    expect(onAction).toHaveBeenCalledWith("submit", {
      kind: "foundation",
      profile: {
        displayName: "Night Bloom Collective",
        headline: "Quiet herbal gatherings for slower rhythms.",
        bio: "Night Bloom Collective hosts reflective tea evenings.",
        tags: ["Dreamwork", "Rituals", "Night Rituals", "Herbalism"],
      },
    });
  });

  it("disables submit and explains the field when an edit is invalid", () => {
    const { onAction } = setup(foundation);
    const headline = screen.getByRole("textbox", { name: "Headline" });

    fireEvent.change(headline, { target: { value: "" } });

    const submit = screen.getByRole("button", { name: "Good to go" });
    expect(submit).toBeDisabled();
    expect(headline).toHaveAttribute("aria-invalid", "true");
    expect(headline).toHaveAccessibleDescription("Add a headline of up to 200 characters.");
    fireEvent.click(submit);
    expect(onAction).not.toHaveBeenCalled();

    fireEvent.change(headline, { target: { value: "x".repeat(201) } });
    expect(submit).toBeDisabled();

    fireEvent.change(headline, { target: { value: "Back within limits." } });
    expect(submit).toBeEnabled();
    expect(headline).not.toHaveAttribute("aria-invalid");
  });

  it("disables Add tag for an empty keyword", () => {
    setup(foundation);
    expect(screen.getByRole("button", { name: "Add tag" })).toBeDisabled();
  });
});

describe("CreatorOnboardingStage — completion rail", () => {
  it("renders coming-soon steps as labelled, disabled and inert", () => {
    const { onAction, onFinish } = setup(completion);
    for (const label of ["Create profile image", "Create cover image", "Refine profile"]) {
      const button = screen.getByRole("button", { name: new RegExp(label) });
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toHaveTextContent("Coming soon");
      fireEvent.click(button);
    }
    expect(onAction).not.toHaveBeenCalled();
    expect(onFinish).not.toHaveBeenCalled();
  });

  it("calls onFinish, not onAction, for Finish for now", () => {
    const { onAction, onFinish } = setup(completion);
    const finish = screen.getByRole("button", { name: "Finish for now" });
    expect(finish).not.toHaveAttribute("aria-disabled");
    fireEvent.click(finish);
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
  });

  it("renders the committed-profile summary slot", () => {
    render(
      <CreatorOnboardingStage
        model={completion}
        onAction={() => {}}
        onFinish={() => {}}
        completionSummary={<p>Lumen Herb Lab</p>}
      />,
    );
    expect(screen.getByText("Lumen Herb Lab")).toBeInTheDocument();
  });
});
