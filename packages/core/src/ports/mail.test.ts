import { describe, expect, it } from "vitest";
import { stubMail } from "./mail";
import { NotImplementedError } from "../errors";

describe("stubMail", () => {
  it("throws NotImplementedError until a real transport is wired", async () => {
    await expect(
      stubMail.sendMagicLink({ email: "a@b.com", url: "https://x/y", token: "t" }),
    ).rejects.toBeInstanceOf(NotImplementedError);
  });
});
