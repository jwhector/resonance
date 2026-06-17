import { z } from "zod";

/** Platform roles (a user can be both over time — Member → Creator conversion). */
export const RoleSchema = z.enum(["creator", "member"]);
export type Role = z.infer<typeof RoleSchema>;

/** Branded id helper — keeps ids from different tables from being interchangeable. */
export type Id<Brand extends string> = string & { readonly __brand: Brand };
