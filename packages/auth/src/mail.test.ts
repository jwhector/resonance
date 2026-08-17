import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { clearObservedMail, peekLoginCode, peekMagicLink, resolveMail } from "./mail";
import { createFakeMail, observeMail } from "./testing/fake-mail";

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
  beforeEach(() => clearObservedMail());
  afterEach(() => clearObservedMail());

  it("returns undefined when nothing has been observed (the production shape)", () => {
    // Production never builds a fake and never calls observeMail, so the slot is empty and
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

  it("reads back the most recent code only after observeMail(fake) is called", async () => {
    const fake = createFakeMail();
    observeMail(fake); // the deliberate opt-in the E2E harness makes
    await fake.port.sendLoginCode({ email: "peek@x.com", otp: "111111", type: "sign-in" });
    await fake.port.sendLoginCode({ email: "peek@x.com", otp: "222222", type: "sign-in" });

    expect(peekLoginCode("peek@x.com")).toBe("222222");
    expect(peekLoginCode("nobody@x.com")).toBeUndefined();
  });

  it("only the observed fake feeds the read-back — a later un-observed fake stays invisible", async () => {
    const observed = createFakeMail();
    observeMail(observed);
    const other = createFakeMail(); // built but NOT observed — must not hijack the slot
    await other.port.sendLoginCode({ email: "other@x.com", otp: "333333", type: "sign-in" });
    await observed.port.sendLoginCode({ email: "seen@x.com", otp: "444444", type: "sign-in" });

    expect(peekLoginCode("seen@x.com")).toBe("444444");
    expect(peekLoginCode("other@x.com")).toBeUndefined();
  });

  it("is hard-inert in production even when a fake HAS been observed (defense-in-depth)", async () => {
    const fake = createFakeMail();
    observeMail(fake);
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

/**
 * The magic-link read-back exists so a test can drive the link channel, which is otherwise
 * unreachable: the URL is only ever emailed, and Better Auth stores a hash of its token rather
 * than the token, so it cannot be rebuilt from the database.
 */
describe("peekMagicLink — the same seam and the same guards as the code read-back", () => {
  beforeEach(() => clearObservedMail());
  afterEach(() => clearObservedMail());

  it("returns undefined when nothing has been observed (the production shape)", () => {
    expect(peekMagicLink("anyone@x.com")).toBeUndefined();
  });

  it("does NOT observe a fake merely because it was constructed", async () => {
    const fake = createFakeMail();
    await fake.port.sendMagicLink({ email: "unobserved@x.com", url: "/link", token: "t" });
    expect(peekMagicLink("unobserved@x.com")).toBeUndefined();
  });

  it("reads back the most recent link only after observeMail(fake) is called", async () => {
    const fake = createFakeMail();
    observeMail(fake);
    await fake.port.sendMagicLink({ email: "peek@x.com", url: "/first", token: "t1" });
    await fake.port.sendMagicLink({ email: "peek@x.com", url: "/second", token: "t2" });

    expect(peekMagicLink("peek@x.com")).toBe("/second");
    expect(peekMagicLink("nobody@x.com")).toBeUndefined();
  });

  it("is hard-inert in production even when a fake HAS been observed (defense-in-depth)", async () => {
    const fake = createFakeMail();
    observeMail(fake);
    await fake.port.sendMagicLink({ email: "prod@x.com", url: "/link", token: "t" });

    const savedEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      expect(peekMagicLink("prod@x.com")).toBeUndefined();
    } finally {
      process.env.NODE_ENV = savedEnv;
    }

    expect(peekMagicLink("prod@x.com")).toBe("/link");
  });

  it("observes both channels from one opt-in, so neither half can be silently missing", async () => {
    // One call registers codes and links together. A harness that had to opt into each separately
    // could drive one channel and look correct until a test reached for the other.
    const fake = createFakeMail();
    observeMail(fake);
    await fake.port.sendMagicLink({ email: "both@x.com", url: "/link", token: "t" });
    await fake.port.sendLoginCode({ email: "both@x.com", otp: "777777", type: "sign-in" });

    expect(peekMagicLink("both@x.com")).toBe("/link");
    expect(peekLoginCode("both@x.com")).toBe("777777");
  });
});

describe("live/stub transport never feeds the read-back (resonance-5d4e)", () => {
  const savedKey = process.env.RESEND_API_KEY;
  beforeEach(() => {
    clearObservedMail();
    delete process.env.RESEND_API_KEY;
  });
  afterEach(() => {
    clearObservedMail();
    if (savedKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = savedKey;
  });

  it("the fail-closed stub does not register codes — peekLoginCode stays inert", async () => {
    // resolveMail() with no key → the stub. It rejects on send and NEVER touches the observation
    // slot; only observeMail ever registers. peekLoginCode remains undefined.
    const mail = resolveMail();
    await expect(
      mail.sendLoginCode({ email: "stub@x.com", otp: "666666", type: "sign-in" }),
    ).rejects.toBeTruthy();
    expect(peekLoginCode("stub@x.com")).toBeUndefined();
  });
});
