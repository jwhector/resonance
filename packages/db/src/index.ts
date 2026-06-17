// @resonance/db — the single data-access layer (Drizzle + Neon Postgres + pgvector).
// ADR-0004 / ADR-0010. All DB access in the system goes through this package.
//
// SKELETON: schema + Drizzle client land in the reference slice (ADR-0013), which adds
// `users`, `creator_profiles`, and a pgvector `embeddings` table. Until then this is a
// typed placeholder so dependents can compile and the boundary is established.

import { NotImplementedError } from "@resonance/core";

/** Opaque handle for the Drizzle client; concrete type arrives with the schema. */
export type Database = unknown;

/**
 * Create the database client. Stubbed until the slice wires Drizzle + Neon.
 * @see .claude/skills/add-db-migration
 */
export function createDb(_connectionString?: string): Database {
  throw new NotImplementedError("@resonance/db (Drizzle client — lands in the reference slice)");
}
