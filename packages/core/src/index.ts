// @resonance/core — cross-cutting types, errors, and ports shared across packages.
// If something is needed by 2+ packages, it belongs here (ADR-0003). No domain logic.

export { ResonanceError, NotImplementedError, ValidationError } from "./errors";
export { type StoragePort, stubStorage } from "./ports/storage";
export { RoleSchema, type Role, type Id } from "./types";
