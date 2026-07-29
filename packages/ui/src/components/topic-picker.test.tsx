import * as React from "react";
import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import type { Topic } from "@resonance/core";
import { describe, expect, it, vi } from "vitest";
import { TopicPicker } from "./topic-picker";

const TOPICS: Topic[] = [
  { slug: "wellness", label: "Wellness" },
  { slug: "herbalism", label: "Herbalism" },
  { slug: "art", label: "Art" },
  { slug: "tea-culture", label: "Tea Culture" },
];

/** Renders the picker with real controlled state, the way `apps/web` will drive it. */
function Harness({
  initial = [],
  onSubmit = () => {},
  ...rest
}: {
  initial?: string[];
  onSubmit?: (slugs: string[]) => void;
  max?: number;
  target?: number;
  pending?: boolean;
}) {
  const [value, setValue] = React.useState<string[]>(initial);
  return (
    <TopicPicker
      topics={TOPICS}
      value={value}
      onValueChange={setValue}
      onSubmit={onSubmit}
      {...rest}
    />
  );
}

describe("TopicPicker", () => {
  it("renders every topic as a checkbox named by its label", () => {
    render(<Harness />);
    for (const topic of TOPICS) {
      expect(screen.getByRole("checkbox", { name: topic.label })).not.toBeChecked();
    }
    expect(screen.getAllByRole("checkbox")).toHaveLength(TOPICS.length);
  });

  it("renders the design's heading and subtitle, with the target count in the copy", () => {
    render(<Harness />);
    expect(screen.getByRole("heading", { name: "Select 3 topics" })).toBeInTheDocument();
    expect(
      screen.getByText("We will suggest creators and offerings resonate with you"),
    ).toBeInTheDocument();
  });

  it("takes the heading count from the target prop", () => {
    render(<Harness target={5} />);
    expect(screen.getByRole("heading", { name: "Select 5 topics" })).toBeInTheDocument();
  });

  it("names the chip group from the heading", () => {
    render(<Harness />);
    expect(screen.getByRole("group", { name: "Select 3 topics" })).toBeInTheDocument();
  });

  it("toggles a topic on and back off", () => {
    render(<Harness />);
    const art = screen.getByRole("checkbox", { name: "Art" });
    fireEvent.click(art);
    expect(art).toBeChecked();
    fireEvent.click(art);
    expect(art).not.toBeChecked();
  });

  it("reports the selection as slugs, in the order chosen", () => {
    const onValueChange = vi.fn();
    render(
      <TopicPicker
        topics={TOPICS}
        value={["art"]}
        onValueChange={onValueChange}
        onSubmit={() => {}}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Wellness" }));
    expect(onValueChange).toHaveBeenCalledWith(["art", "wellness"]);
  });

  it("submits the selected slugs", () => {
    const onSubmit = vi.fn();
    render(<Harness initial={["herbalism"]} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Tea Culture" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith(["herbalism", "tea-culture"]);
  });

  it("is skippable — Continue is enabled with nothing selected and submits an empty list", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);
    const submit = screen.getByRole("button", { name: "Continue" });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith([]);
  });

  it("does not gate Continue on reaching the target count", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} target={3} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Art" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSubmit).toHaveBeenCalledWith(["art"]);
  });

  it("disables the unselected chips once max is reached, leaving the chosen ones toggleable", () => {
    render(<Harness max={2} />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Wellness" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Herbalism" }));

    expect(screen.getByRole("checkbox", { name: "Art" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "Wellness" })).toBeEnabled();

    fireEvent.click(screen.getByRole("checkbox", { name: "Wellness" }));
    expect(screen.getByRole("checkbox", { name: "Art" })).toBeEnabled();
  });

  it("carries a form name on every chip so a plain form POST submits the slugs", () => {
    const { container } = render(<Harness />);
    const inputs = container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    expect([...inputs].map((i) => i.name)).toEqual(TOPICS.map(() => "topicSlugs"));
    expect([...inputs].map((i) => i.value)).toEqual(TOPICS.map((t) => t.slug));
  });

  it("intercepts submission when no action is given, and still reports the selection", () => {
    const onSubmit = vi.fn();
    const { container } = render(<Harness initial={["art"]} onSubmit={onSubmit} />);
    const form = container.querySelector("form")!;
    const submit = createEvent.submit(form);
    fireEvent(form, submit);
    expect(submit.defaultPrevented).toBe(true);
    expect(onSubmit).toHaveBeenCalledWith(["art"]);
  });

  it("submits natively when an action is given — forwards it and does not cancel the event", () => {
    const onSubmit = vi.fn();
    const { container } = render(
      <TopicPicker
        topics={TOPICS}
        value={["art"]}
        onValueChange={() => {}}
        onSubmit={onSubmit}
        action="/onboarding/topics"
      />,
    );
    const form = container.querySelector("form")!;
    expect(form).toHaveAttribute("action", "/onboarding/topics");
    const submit = createEvent.submit(form);
    fireEvent(form, submit);
    expect(submit.defaultPrevented).toBe(false);
    expect(onSubmit).toHaveBeenCalledWith(["art"]);
  });

  it("disables submission while pending", () => {
    const onSubmit = vi.fn();
    render(<Harness pending onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("marks the selected chip with the design's selected treatment", () => {
    render(<Harness initial={["art"]} />);
    const label = screen.getByRole("checkbox", { name: "Art" }).closest("label");
    expect(label?.className).toContain("bg-primary-subtle");
    expect(
      screen.getByRole("checkbox", { name: "Wellness" }).closest("label")?.className,
    ).toContain("border-border");
  });
});
