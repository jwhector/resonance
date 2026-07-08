import { NotImplementedError } from "@resonance/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Resend SDK so the live transport is exercised with zero network.
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send } })),
}));

import { createResendMail, resolveMail } from "./mail";

describe("createResendMail (live Resend transport)", () => {
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ data: { id: "email_1" }, error: null });
  });

  it("sends the magic link through Resend with the link in the body", async () => {
    const mail = createResendMail({ apiKey: "re_test", from: "Resonance <onboarding@resend.dev>" });
    await mail.sendMagicLink({
      email: "u@x.com",
      url: "https://app/verify?token=abc",
      token: "abc",
    });
    expect(send).toHaveBeenCalledTimes(1);
    const arg = send.mock.calls[0][0];
    expect(arg).toMatchObject({ from: "Resonance <onboarding@resend.dev>", to: ["u@x.com"] });
    expect(arg.subject).toMatch(/sign in/i);
    expect(arg.html).toContain("https://app/verify?token=abc");
  });

  it("sends the OTP through Resend with the code in subject + body", async () => {
    const mail = createResendMail({ apiKey: "re_test", from: "F <onboarding@resend.dev>" });
    await mail.sendLoginCode({ email: "u@x.com", otp: "654321", type: "sign-in" });
    const arg = send.mock.calls[0][0];
    expect(arg.to).toEqual(["u@x.com"]);
    expect(arg.subject).toContain("654321");
    expect(arg.html).toContain("654321");
  });

  it("throws (does not swallow) when Resend returns an error", async () => {
    send.mockResolvedValue({ data: null, error: { message: "domain not verified" } });
    const mail = createResendMail({ apiKey: "re_test", from: "F <onboarding@resend.dev>" });
    await expect(
      mail.sendLoginCode({ email: "u@x.com", otp: "111111", type: "sign-in" }),
    ).rejects.toThrow(/domain not verified/);
  });
});

describe("resolveMail precedence (per-seam by key)", () => {
  const saved = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESONANCE_FAKES: process.env.RESONANCE_FAKES,
  };
  beforeEach(() => {
    send.mockReset();
    send.mockResolvedValue({ data: { id: "e" }, error: null });
    delete process.env.RESEND_API_KEY;
    delete process.env.RESONANCE_FAKES;
  });
  afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it("uses live Resend when RESEND_API_KEY is set — even with fakes on", async () => {
    process.env.RESEND_API_KEY = "re_live";
    process.env.RESONANCE_FAKES = "1"; // fakes on, but the key wins for the mail seam
    await resolveMail().sendLoginCode({ email: "u@x.com", otp: "222222", type: "sign-in" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("uses the in-memory fake when only RESONANCE_FAKES is set", async () => {
    process.env.RESONANCE_FAKES = "1";
    await resolveMail().sendLoginCode({ email: "u@x.com", otp: "333333", type: "sign-in" });
    expect(send).not.toHaveBeenCalled();
  });

  it("falls back to the fail-closed stub when neither is set", async () => {
    await expect(
      resolveMail().sendLoginCode({ email: "u@x.com", otp: "444444", type: "sign-in" }),
    ).rejects.toBeInstanceOf(NotImplementedError);
  });
});
