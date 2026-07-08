import { describe, expect, it } from "vitest";
import { createFakeMail } from "./mail";

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
