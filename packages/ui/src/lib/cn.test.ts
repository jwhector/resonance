import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("still resolves stock Tailwind conflicts", () => {
    expect(cn("text-sm", "text-base")).toBe("text-base");
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("keeps a design-system font size alongside a text colour", () => {
    // Regression: tailwind-merge classifies unknown `text-*` as a colour, so before the
    // custom scale was registered this collapsed to just `text-muted` and the 22px
    // heading silently rendered at the inherited size.
    expect(cn("text-heading-md font-medium", "text-muted")).toBe(
      "text-heading-md font-medium text-muted",
    );
    expect(cn("text-body-lg text-foreground")).toBe("text-body-lg text-foreground");
  });

  it("keeps a text colour alongside a design-system font size", () => {
    // The same bug in the other order dropped the *colour*, which turned the brand
    // button's white label into body text on a brand fill.
    expect(cn("bg-primary text-on-primary", "text-body-lg")).toBe(
      "bg-primary text-on-primary text-body-lg",
    );
  });

  it("lets a design-system font size override a stock one, and each other", () => {
    expect(cn("text-sm font-semibold", "text-body-lg font-medium")).toBe(
      "text-body-lg font-medium",
    );
    expect(cn("text-body-lg", "text-heading-md")).toBe("text-heading-md");
  });

  it("still resolves colour against colour", () => {
    expect(cn("text-foreground", "text-muted")).toBe("text-muted");
  });
});
