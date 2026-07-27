// @resonance/core — cross-cutting types, errors, and ports shared across packages.
// If something is needed by 2+ packages, it belongs here (ADR-0003). No domain logic.

export { ResonanceError, NotImplementedError, ValidationError } from "./errors";
export { type StoragePort, stubStorage } from "./ports/storage";
export { type MailPort, stubMail } from "./ports/mail";
export { RoleSchema, type Role, type Id } from "./types";
export { InterviewMessageSchema, type InterviewMessage } from "./interview";
export {
  NameOptionSchema,
  type NameOption,
  CreatorProfileDraftSchema,
  type CreatorProfileDraft,
  CommitProfileInputSchema,
  type CommitProfileInput,
} from "./profile-draft";
export { EMBEDDING_DIMS, EmbeddingDimensionError, assertEmbeddingDims } from "./embedding";
// The discovery contract — the swappable ranking seam (ADR-0017). `web` and `ui` depend on
// this and never on `@resonance/db`'s SQL; `db` supplies the adapter behind it.
export {
  RESULT_KINDS,
  ResultKindSchema,
  type ResultKind,
  FOLLOW_STATES,
  FollowStateSchema,
  type FollowState,
  DISCOVERY_DEFAULT_LIMIT,
  DISCOVERY_MAX_LIMIT,
  DiscoveryQuerySchema,
  type DiscoveryQuery,
  CreatorDiscoveryQuerySchema,
  type CreatorDiscoveryQuery,
  CreatorResultSchema,
  type CreatorResult,
  CreatorResultPageSchema,
  type CreatorResultPage,
  type DiscoveryViewer,
  type DiscoveryPort,
} from "./discovery";
