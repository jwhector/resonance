import { type Role, RoleSchema } from "@resonance/core";

/** Encode a Role[] to the single comma-separated text column Better Auth stores. */
export function encodeRoles(roles: Role[]): string {
  return [...new Set(roles)].join(",");
}

/** Decode the text column back to Role[], validating each value at the boundary. */
export function decodeRoles(raw: string | null | undefined): Role[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => RoleSchema.parse(s));
}
