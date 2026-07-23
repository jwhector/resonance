import { type ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Radio, RadioGroup } from "./radio";

function renderGroup(props?: Partial<ComponentProps<typeof RadioGroup>>) {
  return render(
    <RadioGroup aria-label="Plan" {...props}>
      <Radio value="a" label="Option A" />
      <Radio value="b" label="Option B" />
    </RadioGroup>,
  );
}

describe("RadioGroup", () => {
  it("exposes the radiogroup role and its labeled options", () => {
    renderGroup();
    expect(screen.getByRole("radiogroup", { name: "Plan" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Option A" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Option B" })).toBeInTheDocument();
  });

  it("selects a single option on click and reports the value", () => {
    const onValueChange = vi.fn();
    renderGroup({ onValueChange });
    const a = screen.getByRole("radio", { name: "Option A" });
    const b = screen.getByRole("radio", { name: "Option B" });

    expect(a).not.toBeChecked();
    expect(b).not.toBeChecked();

    fireEvent.click(b);
    expect(b).toBeChecked();
    expect(a).not.toBeChecked();
    expect(onValueChange).toHaveBeenCalledWith("b");
  });

  it("honors a controlled value", () => {
    renderGroup({ value: "a" });
    expect(screen.getByRole("radio", { name: "Option A" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Option B" })).not.toBeChecked();
  });

  it("starts from defaultValue when uncontrolled", () => {
    renderGroup({ defaultValue: "b" });
    expect(screen.getByRole("radio", { name: "Option B" })).toBeChecked();
  });
});
