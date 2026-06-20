// @resonance/db — the single data-access layer (Drizzle + Neon Postgres + pgvector).
// ADR-0004 / ADR-0010. All DB access in the system goes through this package.
//
// Public exports (db singleton, Db type, schema, query helpers) are wired in Task 4.
// Schema, client factory, and PGlite test harness are in place (Task 2).

export { createDb } from "./client";
export type { Db } from "./types";
