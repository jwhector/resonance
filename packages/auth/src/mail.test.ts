import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearObservedLoginCodes, peekLoginCode, resolveMail } from "./mail";
import { createFakeMail, observeLoginCodes } from "./testing/fake-mail";

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

describe("peekLoginCode — read-back is inert unless a fake is EXPLICITLY observed (resonance-5d4e)", () => {
  // Reset the process-wide observation slot around every case so "nothing registered" is a real,
  // deterministic starting state rather than an artifact of test ordering.
  beforeEach(() => clearObservedLoginCodes());
  afterEach(() => clearObservedLoginCodes());

  it("returns undefined when nothing has been observed (the production shape)", () => {
    // Production never builds a fake and never calls observeLoginCodes, so the slot is empty and
    // peekLoginCode can never surface a code. This is that exact shape.
    expect(peekLoginCode("anyone@x.com")).toBeUndefined();
  });

  it("does NOT observe a fake merely because it was constructed (no action-at-a-distance)", async () => {
    // The construction side-effect is gone: creating a fake registers nothing. A code sent through
    // an UN-observed fake stays invisible to peekLoginCode.
    const fake = createFakeMail();
    await fake.port.sendLoginCode({ email: "unobserved@x.com", otp: "999999", type: "sign-in" });
    expect(peekLoginCode("unobserved@x.com")).toBeUndefined();
  });

  it("reads back the most recent code only after observeLoginCodes(fake) is called", async () => {
    const fake = createFakeMail();
    observeLoginCodes(fake); // the deliberate opt-in the E2E harness makes
    await fake.port.sendLoginCode({ email: "peek@x.com", otp: "111111", type: "sign-in" });
    await fake.port.sendLoginCode({ email: "peek@x.com", otp: "222222", type: "sign-in" });

    expect(peekLoginCode("peek@x.com")).toBe("222222");
    expect(peekLoginCode("nobody@x.com")).toBeUndefined();
  });

  it("only the observed fake feeds the read-back — a later un-observed fake stays invisible", async () => {
    const observed = createFakeMail();
    observeLoginCodes(observed);
    const other = createFakeMail(); // built but NOT observed — must not hijack the slot
    await other.port.sendLoginCode({ email: "other@x.com", otp: "333333", type: "sign-in" });
    await observed.port.sendLoginCode({ email: "seen@x.com", otp: "444444", type: "sign-in" });

    expect(peekLoginCode("seen@x.com")).toBe("444444");
    expect(peekLoginCode("other@x.com")).toBeUndefined();
  });

  it("is hard-inert in production even when a fake HAS been observed (defense-in-depth)", async () => {
    const fake = createFakeMail();
    observeLoginCodes(fake);
    await fake.port.sendLoginCode({ email: "prod@x.com", otp: "555555", type: "sign-in" });

    const savedEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      // A registered code is still refused: the prod guard short-circuits the read regardless.
      expect(peekLoginCode("prod@x.com")).toBeUndefined();
    } finally {
      process.env.NODE_ENV = savedEnv;
    }

    // And it works again once we're no longer in production — proving the guard, not a broken slot.
    expect(peekLoginCode("prod@x.com")).toBe("555555");
  });
});

describe("live/stub transport never feeds the read-back (resonance-5d4e)", () => {
  const savedKey = process.env.RESEND_API_KEY;
  beforeEach(() => {
    clearObservedLoginCodes();
    delete process.env.RESEND_API_KEY;
  });
  afterEach(() => {
    clearObservedLoginCodes();
    if (savedKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = savedKey;
  });

  it("the fail-closed stub does not register codes — peekLoginCode stays inert", async () => {
    // resolveMail() with no key → the stub. It rejects on send and NEVER touches the observation
    // slot; only observeLoginCodes ever registers. peekLoginCode remains undefined.
    const mail = resolveMail();
    await expect(
      mail.sendLoginCode({ email: "stub@x.com", otp: "666666", type: "sign-in" }),
    ).rejects.toBeTruthy();
    expect(peekLoginCode("stub@x.com")).toBeUndefined();
  });
});
