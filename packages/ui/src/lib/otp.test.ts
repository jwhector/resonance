import { describe, expect, it } from "vitest";
import { backspaceOtp, clampFocus, joinOtp, padOtp, sanitizeOtp, typeOtp } from "./otp";

describe("sanitizeOtp", () => {
  it("strips non-digits", () => {
    expect(sanitizeOtp("1a2-b3")).toBe("123");
  });
});

describe("padOtp", () => {
  it("pads a short value to the requested length", () => {
    expect(padOtp("12", 6)).toEqual(["1", "2", "", "", "", ""]);
  });

  it("truncates and sanitizes an over-long value", () => {
    expect(padOtp("1234567", 6)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });
});

describe("joinOtp", () => {
  it("concatenates cells", () => {
    expect(joinOtp(["1", "2", "3", "", "", ""])).toBe("123");
  });
});

describe("typeOtp", () => {
  const empty = padOtp("", 6);

  it("fills a cell and advances focus", () => {
    const { cells, focus } = typeOtp(empty, 0, "4");
    expect(joinOtp(cells)).toBe("4");
    expect(focus).toBe(1);
  });

  it("replaces the digit in the targeted cell", () => {
    const start = padOtp("12", 6);
    const { cells } = typeOtp(start, 0, "9");
    expect(joinOtp(cells)).toBe("92");
  });

  it("does not advance past the last cell", () => {
    const start = padOtp("12345", 6);
    const { focus } = typeOtp(start, 5, "6");
    expect(focus).toBe(5);
  });

  it("distributes a pasted code across cells", () => {
    const { cells, focus } = typeOtp(empty, 0, "123456");
    expect(joinOtp(cells)).toBe("123456");
    expect(focus).toBe(5);
  });

  it("ignores non-digit input", () => {
    const { cells, focus } = typeOtp(empty, 0, "a");
    expect(joinOtp(cells)).toBe("");
    expect(focus).toBe(0);
  });
});

describe("backspaceOtp", () => {
  it("clears the current cell when it is filled", () => {
    const start = padOtp("123", 6);
    const { cells, focus } = backspaceOtp(start, 2);
    expect(joinOtp(cells)).toBe("12");
    expect(focus).toBe(2);
  });

  it("clears the previous cell when the current one is empty", () => {
    const start = padOtp("12", 6);
    const { cells, focus } = backspaceOtp(start, 2);
    expect(joinOtp(cells)).toBe("1");
    expect(focus).toBe(1);
  });
});

describe("clampFocus", () => {
  it("clamps below and above the range", () => {
    expect(clampFocus(-3, 6)).toBe(0);
    expect(clampFocus(9, 6)).toBe(5);
    expect(clampFocus(3, 6)).toBe(3);
  });
});
