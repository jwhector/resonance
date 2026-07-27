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
  getCreatorProfileByUserId,
  upsertProfileEmbedding,
  findSimilarProfiles,
  type CreatorProfileRow,
} from "./queries/profiles";
export { setUserRoles } from "./queries/users";

// Discovery (Slice A). `searchCreatorProfiles` is the deep ANN read; `createDiscoveryAdapter`
// wraps it as core's DiscoveryPort so `web`/`ui` depend on the interface and never on this SQL.
export {
  searchCreatorProfiles,
  type CreatorSearchArgs,
  type CreatorSearchPage,
} from "./queries/discovery";
export {
  createDiscoveryAdapter,
  type DiscoveryAdapterDeps,
  type QueryEmbedder,
} from "./adapters/discovery-adapter";
// Follow mutation lives outside the ranking port on purpose — it is not ranking.
export {
  followCreator,
  unfollowCreator,
  getFollowStates,
  type FollowEdge,
} from "./queries/follows";
