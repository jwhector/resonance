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
// `roles` records status earned by completing creator onboarding; `onboarding_intent` records
// what someone said they came here to do. Separate columns, separate write paths.
export { setUserRoles, setOnboardingIntent } from "./queries/users";

// Discovery. `searchCreatorProfiles` is the deep ANN read; `createDiscoveryAdapter`
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
// Member interests. Same precedent as follows: writing an interest is not ranking, so
// it ships as a direct export rather than a second method on DiscoveryPort. The vector it stores
// is what the port's no-text branch ranks by.
export {
  listTopics,
  getMemberInterests,
  setMemberInterests,
  getMemberInterestEmbedding,
  type InterestEmbedder,
  type SetMemberInterestsArgs,
} from "./queries/interests";

// Weave OS evidence capture (ADR-0020). `createObservationAdapter` is core's ObservationPort,
// so the conversation runtime and the evolution harness depend on the interface and never on
// this SQL. The pattern-registry record tables come from `./schema`.
export { insertObservations, insertEvaluation } from "./queries/observations";
export {
  createObservationAdapter,
  type ObservationAdapterDeps,
} from "./adapters/observation-adapter";
