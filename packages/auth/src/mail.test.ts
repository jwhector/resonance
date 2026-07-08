import { describe, expect, it } from "vitest";
import { peekLoginCode } from "./mail";
import { createFakeMail } from "./testing/fake-mail";

describe("peekLoginCode production-safety", () => {
  it("returns undefined for a code no fake ever captured", () => {
    // In production nothing constructs a fake, so nothing registers a capture buffer —
    // peekLoginCode can never surface a real code. An unknown email is always undefined,
    // regardless of any fake other tests in this file may have registered.
    expect(peekLoginCode("never-sent@x.com")).toBeUndefined();
  });
});

describe("fake mail (test-only double, @resonance/auth/testing)", () => {
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

describe("peekLoginCode (read-back of a DI-injected fake's captured OTPs)", () => {
  it("returns the most recent code observed for an email — no env flag", async () => {
    // A fake registers its capture buffer on construction, so peekLoginCode — the cross-scope
    // read-back the E2E OTP harness (resonance-a4a4) uses — observes codes it captured, with
    // NO RESONANCE_FAKES flag. In runtime the harness supplies the fake via createAuth({ mail }).
    const { port } = createFakeMail();
    await port.sendLoginCode({ email: "peek@x.com", otp: "111111", type: "sign-in" });
    await port.sendLoginCode({ email: "peek@x.com", otp: "222222", type: "sign-in" });

    expect(peekLoginCode("peek@x.com")).toBe("222222");
    expect(peekLoginCode("nobody@x.com")).toBeUndefined();
  });
});
