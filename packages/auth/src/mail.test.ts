import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFakeMail, peekLoginCode, resolveMail } from "./mail";

describe("fake mail", () => {
  it("captures sent magic links", async () => {
    const { port, sent } = createFakeMail();
    await port.sendMagicLink({ email: "a@b.com", url: "https://x/verify?token=t", token: "t" });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ email: "a@b.com", token: "t" });
  });

  it("captures sent login codes through the same transport", async () => {
    const { port, codes, sent } = createFakeMail();
    await port.sendLoginCode({ email: "a@b.com", otp: "123456", type: "sign-in" });
    expect(codes).toHaveLength(1);
    expect(codes[0]).toMatchObject({ email: "a@b.com", otp: "123456", type: "sign-in" });
    // magic-link capture is independent — the OTP path does not touch it.
    expect(sent).toHaveLength(0);
  });
});

describe("peekLoginCode (dev/test read-back of the fake transport)", () => {
  const original = process.env.RESONANCE_FAKES;
  beforeEach(() => {
    process.env.RESONANCE_FAKES = "1";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.RESONANCE_FAKES;
    else process.env.RESONANCE_FAKES = original;
  });

  it("returns the most recent code for an email captured by the active fake transport", async () => {
    // resolveMail() returns the SAME devFake singleton peekLoginCode reads under RESONANCE_FAKES.
    const port = resolveMail();
    await port.sendLoginCode({ email: "peek@x.com", otp: "111111", type: "sign-in" });
    await port.sendLoginCode({ email: "peek@x.com", otp: "222222", type: "sign-in" });

    expect(peekLoginCode("peek@x.com")).toBe("222222");
    expect(peekLoginCode("nobody@x.com")).toBeUndefined();
  });

  it("is inert (returns undefined) when RESONANCE_FAKES is not '1'", async () => {
    // Capture a code while fakes is on, then flip the flag off — the read-back must go silent so
    // the seam can never surface a code in a non-fake (prod-shaped) environment.
    await resolveMail().sendLoginCode({ email: "gated@x.com", otp: "999999", type: "sign-in" });
    process.env.RESONANCE_FAKES = "0";
    expect(peekLoginCode("gated@x.com")).toBeUndefined();
  });
});
