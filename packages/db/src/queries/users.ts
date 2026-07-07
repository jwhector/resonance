import { eq } from "drizzle-orm";
import { type Role, RoleSchema } from "@resonance/core";
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
