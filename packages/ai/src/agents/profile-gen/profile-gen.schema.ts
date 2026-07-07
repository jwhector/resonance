import { z } from "zod";
import { OfferingSchema } from "@resonance/db";

/**
 * The structured profile ProfileGen produces from an interview transcript — the
 * `saveProfile` tool's input contract (design spec § Increment 2). It is deliberately the
 * generated *content* only: no `userId` or `status`, which the tool's server context adds
 * when it maps this onto `CreatorProfileInput` for `@resonance/db`.
 */
export const ProfileGenSchema = z.object({
  displayName: z.string().min(1).max(120),
  headline: z.string().min(1).max(200),
  bio: z.string().min(1).max(5000),
  tags: z.array(z.string().min(1)).max(20),
  offerings: z.array(OfferingSchema).max(20),
});

export type GeneratedProfile = z.infer<typeof ProfileGenSchema>;
