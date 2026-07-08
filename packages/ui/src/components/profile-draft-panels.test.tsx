import type { CreatorProfileDraft } from "@resonance/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProfileDraftPanels, type ProfileDraftPanelsProps } from "./profile-draft-panels";

const draft: CreatorProfileDraft = {
  nameOptions: [
    { name: "Moonroot Studio", description: "Reflective herbal and dream-centered experiences." },
    { name: "Isithunywa", description: "Plant-based dreamwork and intentional spaces." },
    { name: "Night Bloom Collective", description: "Quiet herbal gatherings and slower rhythms." },
  ],
  headline: "Dreamwork and herbal reflection for slower inner connection.",
  bio: "Explores dreamwork, herbal blends, and reflective sessions.",
  tags: ["Dreamwork", "Herbal Reflection", "Night Rituals"],
};

const handlers = () => ({
  onSelectName: vi.fn(),
  onHeadlineChange: vi.fn(),
  onBioChange: vi.fn(),
  onTagsChange: vi.fn(),
  onSubmit: vi.fn(),
});

function renderPanels(overrides: Partial<ProfileDraftPanelsProps> = {}) {
  const props = handlers();
  render(<ProfileDraftPanels draft={draft} selectedNameIndex={0} {...props} {...overrides} />);
  return props;
}

describe("ProfileDraftPanels", () => {
  it("renders the verbatim intro copy", () => {
    renderPanels();
    expect(
      screen.getByText("Here are a few creator directions based on everything you shared."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Nothing here needs to be final — this is simply a first version/),
    ).toBeInTheDocument();
  });

  it("renders the three name options as radios", () => {
    renderPanels();
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(screen.getByRole("radio", { name: /Moonroot Studio/ })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Night Bloom Collective/ })).toBeInTheDocument();
  });

  it("fires onSelectName with the chosen option index", () => {
    const props = renderPanels();
    fireEvent.click(screen.getByRole("radio", { name: /Night Bloom Collective/ }));
    expect(props.onSelectName).toHaveBeenCalledWith(2);
  });

  it("fires onHeadlineChange when the headline is edited", () => {
    const props = renderPanels();
    fireEvent.change(screen.getByLabelText("Headline"), { target: { value: "New headline" } });
    expect(props.onHeadlineChange).toHaveBeenCalledWith("New headline");
  });

  it("fires onBioChange when the About field is edited", () => {
    const props = renderPanels();
    const about = screen.getByLabelText("About");
    expect(about.tagName).toBe("TEXTAREA");
    fireEvent.change(about, { target: { value: "New bio" } });
    expect(props.onBioChange).toHaveBeenCalledWith("New bio");
  });

  it("fires onTagsChange with the remaining tags when a keyword is removed", () => {
    const props = renderPanels();
    fireEvent.click(screen.getByRole("button", { name: "Remove Herbal Reflection" }));
    expect(props.onTagsChange).toHaveBeenCalledWith(["Dreamwork", "Night Rituals"]);
  });

  it("renders the refine composer visibly disabled (deferred loop)", () => {
    renderPanels();
    expect(screen.getByRole("textbox", { name: /Talk to Weave/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Send to Weave" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Revise with Weave" })).toBeDisabled();
  });

  it("fires onSubmit when the primary action is taken", () => {
    const props = renderPanels();
    fireEvent.click(screen.getByRole("button", { name: "Good to go" }));
    expect(props.onSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows a submitting state and disables the primary action", () => {
    renderPanels({ submitting: true });
    const primary = screen.getByRole("button", { name: "Saving…" });
    expect(primary).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Good to go" })).not.toBeInTheDocument();
  });
});
