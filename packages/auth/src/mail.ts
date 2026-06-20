import { type MailPort, stubMail } from "@resonance/core";

export function createFakeMail(): {
  port: MailPort;
  sent: Array<{ email: string; url: string; token: string }>;
} {
  const sent: Array<{ email: string; url: string; token: string }> = [];
  return {
    sent,
    port: {
      async sendMagicLink(args) {
        sent.push(args);
        // Surface the link in dev so a human can click it without a mailbox.
        if (process.env.NODE_ENV !== "test") {
          console.info(`[fake-mail] magic link for ${args.email}: ${args.url}`);
        }
      },
    },
  };
}

const devFake = createFakeMail();

/** Select the mail transport. Fake under RESONANCE_FAKES; otherwise the stub
 *  (live Resend transport is wired with the sign-in UX in Increment 3). */
export function resolveMail(): MailPort {
  if (process.env.RESONANCE_FAKES === "1") return devFake.port;
  return stubMail;
}
