import { eq } from "drizzle-orm";
import {
  type OnboardingIntent,
  OnboardingIntentSchema,
  type Role,
  RoleSchema,
} from "@resonance/core";
import { user } from "../schema/auth";
import type { Db } from "../types";

/**
 * Encode a Role[] into the single comma-separated text column Better Auth stores on
 * `user.roles`. Private to this package: db owns the column and therefore its encoding
 * (the auth package keeps its own `encodeRoles` for the Better Auth config path).
 */
function encodeRoles(roles: Role[]): string {
  return [...new Set(roles.map((r) => RoleSchema.parse(r)))].join(",");
}

/**
 * Overwrite a user's roles. This is the single data-layer write path for the
 * `user.roles` column, so callers — e.g. the profile-gen `saveProfile` tool flipping a
 * member into a creator on publish — never construct SQL or hand-encode the column
 * themselves, keeping the ai→db boundary clean (ADR-0003).
 */
export async function setUserRoles(db: Db, userId: string, roles: Role[]): Promise<void> {
  await db
    .update(user)
    .set({ roles: encodeRoles(roles) })
    .where(eq(user.id, userId));
}

/**
 * Record what a user says they came here to do. The single data-layer write path for the
 * `user.onboarding_intent` column, so no caller hand-writes SQL or an unvalidated string
 * into it.
 *
 * Validated here rather than trusted from the type, because both callers get their value
 * from something a person can type: signup reads it back off a URL, and the member →
 * creator conversion screen posts it from a form. An unrecognized value throws instead of
 * being stored, so the column only ever holds a real intent or nothing at all.
 *
 * **Writes the latest stated intent, overwriting any earlier one.** The question is asked
 * more than once — someone who answered "explore" at signup and later converts to creating
 * has genuinely changed their answer, and the current one is the more useful record. This
 * is safe precisely because intent is not status: overwriting it can never demote someone,
 * since a completed creator is recorded by their role, which this function does not touch.
 *
 * Re-recording the same intent leaves the stored answer unchanged, so a resubmitted form or a
 * retried action is safe to repeat. It is not invisible, though: the user row stamps
 * `updatedAt` on every write, so a restatement still moves that timestamp. Anything that reads
 * `updatedAt` as "when this user last changed" should expect a restated intent to count.
 */
export async function setOnboardingIntent(
  db: Db,
  userId: string,
  intent: OnboardingIntent,
): Promise<void> {
  await db
    .update(user)
    .set({ onboardingIntent: OnboardingIntentSchema.parse(intent) })
    .where(eq(user.id, userId));
}
