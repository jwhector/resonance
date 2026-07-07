// @resonance/db — single data-access layer (Drizzle + Neon Postgres + pgvector).
// ADR-0004 / ADR-0010. All DB access in the system goes through this package.
//
// Production bundles import from "@resonance/db".
// Test harness (PGlite) lives at "@resonance/db/testing" — never bundled in production.

export * from "./schema";
export type { Db } from "./types";
export { createDb } from "./client";
export {
  createCreatorProfile,
  getCreatorProfileById,
  upsertProfileEmbedding,
  findSimilarProfiles,
  type CreatorProfileRow,
} from "./queries/profiles";
export { setUserRoles } from "./queries/users";
