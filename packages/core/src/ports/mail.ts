import { NotImplementedError } from "../errors";

/**
 * Outbound transactional email. Auth sends magic links through this port so the
 * transport (Resend) can be swapped for a fake in tests/dev (mock-first).
 */
export type MailPort = {
  sendMagicLink(args: { email: string; url: string; token: string }): Promise<void>;
};

export const stubMail: MailPort = {
  sendMagicLink(): Promise<void> {
    return Promise.reject(new NotImplementedError("MailPort.sendMagicLink"));
  },
};
