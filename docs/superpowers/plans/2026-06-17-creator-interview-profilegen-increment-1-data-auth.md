# Creator Interview → ProfileGen — Increment 1 (Data + Auth) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `@resonance/db` and `@resonance/auth` real — a Drizzle/Neon schema with pgvector (users via Better Auth, `creator_profiles`, `embeddings`), tested in-process against PGlite, plus a Better Auth magic-link instance — so the AI and UI increments have a real data + identity foundation.

**Architecture:** Schema and queries live in `@resonance/db` (Neon serverless driver in prod; the same Drizzle code runs against in-process PGlite+pgvector in tests). `@resonance/auth` wraps Better Auth (magic-link) over that Drizzle client, sending mail through a `MailPort` port (a capturing fake in tests/dev; live Resend deferred to the UI increment). No credentials are needed to build or test — this is the mock-first foundation.

**Tech Stack:** Drizzle ORM `0.45.2` + drizzle-kit `0.31.10`, `@neondatabase/serverless` `1.1.0` (neon-http), pgvector, Better Auth `1.6.20`, PGlite `0.5.3` + `@electric-sql/pglite-pgvector` `0.0.4`, Vitest, TypeScript strict ESM, Zod.

## Global Constraints

- **This is Increment 1 of 3.** Scope is data + auth only. The AI layer (Increment 2) and UI + wiring + E2E (Increment 3) are separate plans written after each prior increment lands green. Do **not** build agents, UI, routes, or Server Actions here.
- **Branch:** `feat/creator-interview-profilegen` (already checked out).
- **Spec:** `docs/superpowers/specs/2026-06-17-creator-interview-profilegen-design.md` — the source of truth; this plan implements its Increment 1.
- **Conventions (`docs/conventions.md`):** TypeScript strict (`noUncheckedIndexedAccess`, `noUnusedLocals` on — don't loosen); `import type` for types; no `any`; `type` aliases over `interface` unless merging is needed; public API only from each package's `src/index.ts`.
- **Validation:** Zod at every boundary; infer TS types from schemas (`type Foo = z.infer<typeof FooSchema>`).
- **Naming:** files `kebab-case.ts`; domain tables `snake_case` plural with `camelCase` Drizzle keys; Zod schemas `FooSchema`. Better Auth's own tables keep its singular names (`user`/`session`/`account`/`verification`) — the sanctioned exception.
- **Errors:** throw typed `@resonance/core` errors (stable `code`), never bare strings; don't swallow.
- **Embedding dims:** `vector(1024)` everywhere, pinned to Voyage `voyage-3.5` (chosen in Increment 2). Keep the literal `1024` consistent across schema and tests.
- **Migrations are generated** via drizzle-kit, never hand-edited — except the one intentional custom `CREATE EXTENSION` migration (Task 2).
- **Each task ends green and committed.** Commit messages: `feat:` / `chore:` / `docs:` (conventional).
- **Verify, don't assume:** run the exact command shown and confirm output before checking a step. The full gate is `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

## File Structure

**`@resonance/core`** (add one port)

- Create `packages/core/src/ports/mail.ts` — `MailPort` interface + `stubMail`.
- Modify `packages/core/src/index.ts` — export them.

**`@resonance/db`** (skeleton → real)

- Modify `packages/db/package.json` — deps + `db:generate`/`db:migrate` scripts.
- Create `packages/db/drizzle.config.ts`.
- Create `packages/db/src/schema/auth.ts` — Better Auth tables (`user`/`session`/`account`/`verification`) incl. the `roles` additional field.
- Create `packages/db/src/schema/creator.ts` — `creator_profiles`, `embeddings` + Zod schemas.
- Create `packages/db/src/schema/index.ts` — schema barrel.
- Create `packages/db/src/types.ts` — driver-agnostic `Db` type.
- Create `packages/db/src/client.ts` — Neon (prod) client.
- Create `packages/db/src/queries/profiles.ts` — profile + embedding queries incl. `findSimilarProfiles`.
- Create `packages/db/src/testing/create-test-db.ts` — PGlite+pgvector migrated test DB.
- Create `packages/db/drizzle/0000_enable_pgvector.sql` (custom) + generated table migration(s).
- Create tests: `packages/db/src/schema/creator.test.ts`, `packages/db/src/queries/profiles.test.ts`.
- Modify `packages/db/src/index.ts` + `packages/db/CLAUDE.md`.

**`@resonance/auth`** (skeleton → real)

- Modify `packages/auth/package.json` — add `better-auth`, `@resonance/db`.
- Create `packages/auth/src/roles.ts` (+ `roles.test.ts`) — encode/decode `Role[]` ↔ text.
- Create `packages/auth/src/mail.ts` — `createFakeMail()` + `resolveMail()`.
- Create `packages/auth/src/auth.ts` — `createAuth({ db, mail })` + `auth` singleton.
- Create `packages/auth/src/session.ts` — `getSession()` helper.
- Create `packages/auth/src/auth.test.ts` — magic-link sign-in→verify integration test.
- Modify `packages/auth/src/index.ts` + `packages/auth/CLAUDE.md`.

**Repo**

- Modify `.env.example` — add `RESONANCE_FAKES`.
- Modify `docs/architecture/resonance-architecture.drawio` (+ regenerate outputs) — `db`/`auth` stub → real.
- Modify `HANDOFF.md` — mark Increment 1 done.

---

### Task 1: `@resonance/core` — add `MailPort`

**Files:**

- Create: `packages/core/src/ports/mail.ts`
- Modify: `packages/core/src/index.ts`
- Test: `packages/core/src/ports/mail.test.ts`

**Interfaces:**

- Consumes: `NotImplementedError` from `packages/core/src/errors.ts`.
- Produces: `MailPort` (`{ sendMagicLink(args: { email: string; url: string; token: string }): Promise<void> }`) and `stubMail: MailPort`. Consumed by `@resonance/auth` Task 3.

- [ ] **Step 1: Write the failing test**

```ts
// packages/core/src/ports/mail.test.ts
import { describe, expect, it } from "vitest";
import { stubMail } from "./mail";
import { NotImplementedError } from "../errors";

describe("stubMail", () => {
  it("throws NotImplementedError until a real transport is wired", async () => {
    await expect(
      stubMail.sendMagicLink({ email: "a@b.com", url: "https://x/y", token: "t" }),
    ).rejects.toBeInstanceOf(NotImplementedError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resonance/core test`
Expected: FAIL — `Cannot find module './mail'`.

- [ ] **Step 3: Create the port**

```ts
// packages/core/src/ports/mail.ts
import { NotImplementedError } from "../errors";

/**
 * Outbound transactional email. Auth sends magic links through this port so the
 * transport (Resend) can be swapped for a fake in tests/dev (mock-first).
 */
export type MailPort = {
  sendMagicLink(args: { email: string; url: string; token: string }): Promise<void>;
};

export const stubMail: MailPort = {
  sendMagicLink() {
    throw new NotImplementedError("MailPort.sendMagicLink is not implemented");
  },
};
```

Verify `NotImplementedError`'s constructor accepts a message — open `packages/core/src/errors.ts` and confirm the signature; if it takes `(code, message)` or similar, match it exactly here and in the test.

- [ ] **Step 4: Export from the package entrypoint**

In `packages/core/src/index.ts`, add alongside the existing exports (mirror how `ports/storage.ts` is exported):

```ts
export type { MailPort } from "./ports/mail";
export { stubMail } from "./ports/mail";
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @resonance/core test`
Expected: PASS.

- [ ] **Step 6: Typecheck + commit**

```bash
pnpm --filter @resonance/core typecheck
git add packages/core/src/ports/mail.ts packages/core/src/ports/mail.test.ts packages/core/src/index.ts
git commit -m "feat(core): add MailPort port for magic-link delivery"
```

---

### Task 2: `@resonance/db` — schema, client, migrations, PGlite test harness

This is the foundation task: dependencies, Drizzle config, the full schema, the Neon client, the driver-agnostic `Db` type, the generated migrations (incl. the pgvector extension), and a PGlite-backed test DB. Its deliverable is **a migrated in-memory test database with a working `vector` column**, proven by a schema test.

**Files:**

- Modify: `packages/db/package.json`
- Create: `packages/db/drizzle.config.ts`, `packages/db/src/schema/auth.ts`, `packages/db/src/schema/creator.ts`, `packages/db/src/schema/index.ts`, `packages/db/src/types.ts`, `packages/db/src/client.ts`, `packages/db/src/testing/create-test-db.ts`
- Create (generated/custom): `packages/db/drizzle/0000_enable_pgvector.sql` + `packages/db/drizzle/0001_*.sql` + `packages/db/drizzle/meta/*`
- Test: `packages/db/src/schema/creator.test.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - Tables `user`, `session`, `account`, `verification` (Better Auth shapes) from `schema/auth.ts`.
  - `creatorProfiles`, `embeddings` Drizzle tables + `CreatorProfileSchema`, `OfferingSchema`, `EmbeddingSourceType` from `schema/creator.ts`.
  - `schema` barrel (`import * as schema`) from `schema/index.ts`.
  - `type Db` from `types.ts` — `PgDatabase<PgQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>`.
  - `db` (Neon client) from `client.ts`.
  - `createTestDb(): Promise<{ db: TestDb; client: PGlite; close: () => Promise<void> }>` from `testing/create-test-db.ts`.

- [ ] **Step 1: Add dependencies and scripts**

Edit `packages/db/package.json` — add to `dependencies` and `devDependencies` and add the two scripts (keep the existing `@resonance/core` dependency and existing scripts):

```jsonc
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
  },
  "dependencies": {
    "@resonance/core": "workspace:*",
    "drizzle-orm": "0.45.2",
    "@neondatabase/serverless": "1.1.0",
  },
  "devDependencies": {
    "drizzle-kit": "0.31.10",
    "@electric-sql/pglite": "0.5.3",
    "@electric-sql/pglite-pgvector": "0.0.4",
    "dotenv": "17.4.2",
  },
}
```

Then install from the repo root:

Run: `pnpm install`
Expected: resolves and writes the lockfile with no errors.

- [ ] **Step 2: Drizzle config**

```ts
// packages/db/drizzle.config.ts
import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
  verbose: true,
});
```

Note: `drizzle-kit generate` reads only the schema files — it does **not** connect to a DB, so no `DATABASE_URL` is needed to generate migrations.

- [ ] **Step 3: Better Auth tables**

```ts
// packages/db/src/schema/auth.ts
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// Better Auth owns these table names (singular) — the sanctioned naming exception.
// Column shapes match Better Auth 1.6.x's Postgres schema; `roles` is our additionalField.
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  // additionalField: comma-encoded Role[] (see @resonance/auth roles.ts). Default member.
  roles: text("roles").default("member").notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);
```

- [ ] **Step 4: Domain tables (`creator_profiles`, `embeddings`) + Zod**

```ts
// packages/db/src/schema/creator.ts
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";
import { z } from "zod";
import { user } from "./auth";

export const OfferingSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(2000),
});
export type Offering = z.infer<typeof OfferingSchema>;

export const ProfileStatusSchema = z.enum(["draft", "ready"]);
export type ProfileStatus = z.infer<typeof ProfileStatusSchema>;

export const creatorProfiles = pgTable("creator_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  headline: text("headline").notNull(),
  bio: text("bio").notNull(),
  tags: jsonb("tags")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  offerings: jsonb("offerings")
    .$type<Offering[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  status: text("status").$type<ProfileStatus>().notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Generic, polymorphic vector store. sourceType is open-ended; only "creator_profile"
// is used in this slice. sourceId is the uuid of the source row.
export const EMBEDDING_SOURCE_TYPES = ["creator_profile", "offering", "post", "interest"] as const;
export const EmbeddingSourceTypeSchema = z.enum(EMBEDDING_SOURCE_TYPES);
export type EmbeddingSourceType = z.infer<typeof EmbeddingSourceTypeSchema>;

export const embeddings = pgTable(
  "embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceType: text("source_type").$type<EmbeddingSourceType>().notNull(),
    sourceId: uuid("source_id").notNull(),
    model: text("model").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1024 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("embeddings_embedding_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
    uniqueIndex("embeddings_source_model_uq").on(t.sourceType, t.sourceId, t.model),
  ],
);

// Row-shape Zod schema (boundary validation / inference for inserts).
export const CreatorProfileInputSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1).max(120),
  headline: z.string().min(1).max(200),
  bio: z.string().min(1).max(5000),
  tags: z.array(z.string().min(1)).max(20).default([]),
  offerings: z.array(OfferingSchema).max(20).default([]),
  status: ProfileStatusSchema.default("ready"),
});
export type CreatorProfileInput = z.infer<typeof CreatorProfileInputSchema>;
```

- [ ] **Step 5: Schema barrel + `Db` type + Neon client**

```ts
// packages/db/src/schema/index.ts
export * from "./auth";
export * from "./creator";
```

```ts
// packages/db/src/types.ts
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/** Any Drizzle Postgres DB bound to our schema — Neon (prod) or PGlite (tests). */
export type Db = PgDatabase<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
```

```ts
// packages/db/src/client.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/** Production client over the Neon serverless HTTP driver. Lazily reads DATABASE_URL. */
export function createDb(connectionString = process.env.DATABASE_URL): ReturnType<typeof drizzle> {
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to create the production database client");
  }
  return drizzle({ client: neon(connectionString), schema });
}
```

Note: this replaces the old `createDb`/`Database` skeleton. The exported public `db` and `Db` are wired in Task 4 (`index.ts`); query functions take a `Db` param so they work against Neon or PGlite.

- [ ] **Step 6: Generate the pgvector extension migration (custom)**

Run (from `packages/db`):
`pnpm --filter @resonance/db exec drizzle-kit generate --custom --name=enable_pgvector`
Expected: creates `packages/db/drizzle/0000_enable_pgvector.sql` (empty) + `drizzle/meta/`.

Edit `packages/db/drizzle/0000_enable_pgvector.sql` to contain exactly:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

This runs first (lowest number) so later vector-column migrations succeed. On Neon, pgvector is preinstalled, so `IF NOT EXISTS` is a no-op there; in PGlite the extension is made available via the constructor (Step 8) and this statement registers it.

- [ ] **Step 7: Generate the table migration**

Run: `pnpm --filter @resonance/db exec drizzle-kit generate`
Expected: creates `packages/db/drizzle/0001_*.sql` creating `user`, `session`, `account`, `verification`, `creator_profiles`, `embeddings` with the HNSW + unique indexes. Open it and confirm the `embedding` column is `vector(1024)` and the index uses `hnsw (... vector_cosine_ops)`.

- [ ] **Step 8: PGlite test harness**

```ts
// packages/db/src/testing/create-test-db.ts
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { vector } from "@electric-sql/pglite-pgvector";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../schema";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../drizzle", import.meta.url));

export type TestDb = PgliteDatabase<typeof schema>;

/** Fresh, isolated, in-memory Postgres+pgvector with all real migrations applied. */
export async function createTestDb(): Promise<{
  db: TestDb;
  client: PGlite;
  close: () => Promise<void>;
}> {
  const client = new PGlite({ extensions: { vector } });
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
  return { db, client, close: () => client.close() };
}
```

- [ ] **Step 9: Write the failing schema test**

```ts
// packages/db/src/schema/creator.test.ts
import { eq, sql } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTestDb, type TestDb } from "../testing/create-test-db";
import { creatorProfiles, embeddings } from "./creator";
import { user } from "./auth";

const vec = (fill: number) => Array.from({ length: 1024 }, () => fill);

describe("creator schema (PGlite + pgvector)", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
  });
  afterEach(async () => {
    await close();
  });

  it("persists a profile and a 1024-dim embedding row", async () => {
    await db.insert(user).values({ id: "u1", name: "Ada", email: "ada@x.com" });
    const [profile] = await db
      .insert(creatorProfiles)
      .values({
        userId: "u1",
        displayName: "Ada",
        headline: "Maker of things",
        bio: "I build delightful tools.",
        tags: ["craft", "tools"],
        offerings: [{ title: "Workshop", description: "A hands-on session." }],
        status: "ready",
      })
      .returning();
    expect(profile?.id).toBeTruthy();
    expect(profile?.tags).toEqual(["craft", "tools"]);

    await db.insert(embeddings).values({
      sourceType: "creator_profile",
      sourceId: profile!.id,
      model: "voyage-3.5",
      content: "Ada — Maker of things",
      embedding: vec(0.1),
    });

    const rows = await db
      .select()
      .from(embeddings)
      .where(eq(embeddings.sourceType, "creator_profile"));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.embedding).toHaveLength(1024);

    // the pgvector distance operator is available (extension registered)
    const probe = await db.execute(sql`select '[1,0,0]'::vector <=> '[0,1,0]'::vector as d`);
    expect(probe).toBeTruthy();
  });
});
```

- [ ] **Step 10: Run the test to verify it fails, then passes**

Run: `pnpm --filter @resonance/db test`
Expected first: FAIL only because nothing is wired wrong — if it fails to find migrations or the `vector` type, fix per the error (most likely: the extension migration ordering, or a missing `@electric-sql/pglite-pgvector` install). Re-run until PASS. The test passing proves migrations apply and pgvector works in-process.

- [ ] **Step 11: Typecheck + commit**

```bash
pnpm --filter @resonance/db typecheck
git add packages/db
git commit -m "feat(db): real Drizzle schema (auth + creator_profiles + embeddings) with pgvector, migrations, and PGlite test harness"
```

---

### Task 3: `@resonance/db` — profile + embedding queries

**Files:**

- Create: `packages/db/src/queries/profiles.ts`
- Test: `packages/db/src/queries/profiles.test.ts`

**Interfaces:**

- Consumes: `Db` (Task 2), `creatorProfiles`/`embeddings`/`CreatorProfileInput` (Task 2).
- Produces (all take `db: Db` as first arg so they accept Neon or PGlite):
  - `createCreatorProfile(db, input: CreatorProfileInput): Promise<CreatorProfileRow>`
  - `getCreatorProfileById(db, id: string): Promise<CreatorProfileRow | undefined>`
  - `upsertProfileEmbedding(db, args: { profileId: string; model: string; content: string; embedding: number[] }): Promise<void>`
  - `findSimilarProfiles(db, embedding: number[], limit?: number): Promise<Array<{ id: string; displayName: string; headline: string; similarity: number }>>`
  - `type CreatorProfileRow = typeof creatorProfiles.$inferSelect`

- [ ] **Step 1: Write the failing test**

```ts
// packages/db/src/queries/profiles.test.ts
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { user } from "../schema/auth";
import { createTestDb, type TestDb } from "../testing/create-test-db";
import {
  createCreatorProfile,
  findSimilarProfiles,
  getCreatorProfileById,
  upsertProfileEmbedding,
} from "./profiles";

const unit = (i: number) => {
  const v = Array.from({ length: 1024 }, () => 0);
  v[i] = 1;
  return v;
};

describe("profile queries", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await db.insert(user).values({ id: "u1", name: "Ada", email: "ada@x.com" });
  });
  afterEach(async () => {
    await close();
  });

  it("creates and reads back a profile", async () => {
    const created = await createCreatorProfile(db, {
      userId: "u1",
      displayName: "Ada",
      headline: "Maker",
      bio: "Builds tools.",
      tags: ["tools"],
      offerings: [],
      status: "ready",
    });
    const read = await getCreatorProfileById(db, created.id);
    expect(read?.displayName).toBe("Ada");
  });

  it("ranks profiles by cosine similarity to a query vector", async () => {
    const near = await createCreatorProfile(db, {
      userId: "u1",
      displayName: "Near",
      headline: "h",
      bio: "b",
      tags: [],
      offerings: [],
      status: "ready",
    });
    const far = await createCreatorProfile(db, {
      userId: "u1",
      displayName: "Far",
      headline: "h",
      bio: "b",
      tags: [],
      offerings: [],
      status: "ready",
    });
    await upsertProfileEmbedding(db, {
      profileId: near.id,
      model: "voyage-3.5",
      content: "n",
      embedding: unit(0),
    });
    await upsertProfileEmbedding(db, {
      profileId: far.id,
      model: "voyage-3.5",
      content: "f",
      embedding: unit(1),
    });

    const results = await findSimilarProfiles(db, unit(0), 10);
    expect(results[0]?.id).toBe(near.id);
    expect(results[0]!.similarity).toBeGreaterThan(results[1]!.similarity);
  });

  it("upsert replaces the embedding for the same (source, model)", async () => {
    const p = await createCreatorProfile(db, {
      userId: "u1",
      displayName: "P",
      headline: "h",
      bio: "b",
      tags: [],
      offerings: [],
      status: "ready",
    });
    await upsertProfileEmbedding(db, {
      profileId: p.id,
      model: "voyage-3.5",
      content: "v1",
      embedding: unit(0),
    });
    await upsertProfileEmbedding(db, {
      profileId: p.id,
      model: "voyage-3.5",
      content: "v2",
      embedding: unit(2),
    });
    const results = await findSimilarProfiles(db, unit(2), 10);
    expect(results.filter((r) => r.id === p.id)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resonance/db test src/queries/profiles.test.ts`
Expected: FAIL — `Cannot find module './profiles'`.

- [ ] **Step 3: Implement the queries**

```ts
// packages/db/src/queries/profiles.ts
import { cosineDistance, desc, eq, sql } from "drizzle-orm";
import { creatorProfiles, embeddings, type CreatorProfileInput } from "../schema/creator";
import type { Db } from "../types";

export type CreatorProfileRow = typeof creatorProfiles.$inferSelect;

export async function createCreatorProfile(
  db: Db,
  input: CreatorProfileInput,
): Promise<CreatorProfileRow> {
  const [row] = await db.insert(creatorProfiles).values(input).returning();
  if (!row) throw new Error("createCreatorProfile: insert returned no row");
  return row;
}

export async function getCreatorProfileById(
  db: Db,
  id: string,
): Promise<CreatorProfileRow | undefined> {
  const [row] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.id, id)).limit(1);
  return row;
}

export async function upsertProfileEmbedding(
  db: Db,
  args: { profileId: string; model: string; content: string; embedding: number[] },
): Promise<void> {
  await db
    .insert(embeddings)
    .values({
      sourceType: "creator_profile",
      sourceId: args.profileId,
      model: args.model,
      content: args.content,
      embedding: args.embedding,
    })
    .onConflictDoUpdate({
      target: [embeddings.sourceType, embeddings.sourceId, embeddings.model],
      set: { content: args.content, embedding: args.embedding },
    });
}

export async function findSimilarProfiles(
  db: Db,
  embedding: number[],
  limit = 10,
): Promise<Array<{ id: string; displayName: string; headline: string; similarity: number }>> {
  const similarity = sql<number>`1 - (${cosineDistance(embeddings.embedding, embedding)})`;
  return db
    .select({
      id: creatorProfiles.id,
      displayName: creatorProfiles.displayName,
      headline: creatorProfiles.headline,
      similarity,
    })
    .from(embeddings)
    .innerJoin(creatorProfiles, eq(creatorProfiles.id, embeddings.sourceId))
    .where(eq(embeddings.sourceType, "creator_profile"))
    .orderBy(desc(similarity))
    .limit(limit);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @resonance/db test src/queries/profiles.test.ts`
Expected: PASS (all three tests).

- [ ] **Step 5: Commit**

```bash
pnpm --filter @resonance/db typecheck
git add packages/db/src/queries
git commit -m "feat(db): profile + embedding queries incl. cosine findSimilarProfiles"
```

---

### Task 4: `@resonance/db` — public exports + CLAUDE.md

**Files:**

- Modify: `packages/db/src/index.ts`, `packages/db/CLAUDE.md`

**Interfaces:**

- Produces the package's public surface: `db` (default Neon client, lazy), `createDb`, `type Db`, the schema tables/Zod schemas, and the query functions. `createTestDb` is exported from a separate `@resonance/db/testing` subpath so production bundles don't pull in PGlite.

- [ ] **Step 1: Rewrite `src/index.ts`**

```ts
// packages/db/src/index.ts
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
```

- [ ] **Step 2: Add the `testing` subpath export**

In `packages/db/package.json`, extend `exports` so tests in other packages import the harness without it landing in app bundles:

```jsonc
"exports": {
  ".": "./src/index.ts",
  "./testing": "./src/testing/create-test-db.ts"
}
```

- [ ] **Step 3: Update `packages/db/CLAUDE.md`**

Replace the "skeleton / lands in the reference slice" language with the real state. Document: tables (`user`/`session`/`account`/`verification` owned by Better Auth; `creator_profiles`, `embeddings`), the generic embeddings design (`sourceType`/`sourceId`, only `creator_profile` used now — point to the spec's _Future evolution_), `vector(1024)` pinned to Voyage `voyage-3.5`, the Neon-in-prod / PGlite-in-test split, that migrations are generated (never hand-edited) except `0000_enable_pgvector.sql`, and the `@resonance/db/testing` subpath. Keep it concise and match the tone of the other package CLAUDE.md files.

- [ ] **Step 4: Verify package builds and typechecks; commit**

Run: `pnpm --filter @resonance/db typecheck && pnpm --filter @resonance/db test`
Expected: PASS.

```bash
git add packages/db/src/index.ts packages/db/package.json packages/db/CLAUDE.md
git commit -m "feat(db): publish public API + testing subpath; mark package real"
```

---

### Task 5: `@resonance/auth` — roles encode/decode

**Files:**

- Modify: `packages/auth/package.json` (add deps)
- Create: `packages/auth/src/roles.ts`
- Test: `packages/auth/src/roles.test.ts`

**Interfaces:**

- Consumes: `RoleSchema`/`Role` from `@resonance/core`.
- Produces: `encodeRoles(roles: Role[]): string`, `decodeRoles(raw: string | null | undefined): Role[]`. Used by the Better Auth instance (Task 7) and `saveProfile` in Increment 2.

- [ ] **Step 1: Add dependencies**

Edit `packages/auth/package.json` `dependencies` (keep existing `@resonance/core`):

```jsonc
"dependencies": {
  "@resonance/core": "workspace:*",
  "@resonance/db": "workspace:*",
  "better-auth": "1.6.20"
}
```

Run: `pnpm install`
Expected: resolves cleanly.

- [ ] **Step 2: Write the failing test**

```ts
// packages/auth/src/roles.test.ts
import { describe, expect, it } from "vitest";
import { decodeRoles, encodeRoles } from "./roles";

describe("roles codec", () => {
  it("round-trips and de-dupes", () => {
    expect(encodeRoles(["member", "creator", "member"])).toBe("member,creator");
    expect(decodeRoles("member,creator")).toEqual(["member", "creator"]);
  });
  it("defaults empty/nullish to []", () => {
    expect(decodeRoles("")).toEqual([]);
    expect(decodeRoles(null)).toEqual([]);
    expect(decodeRoles(undefined)).toEqual([]);
  });
  it("rejects unknown roles at the boundary", () => {
    expect(() => decodeRoles("member,wizard")).toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @resonance/auth test`
Expected: FAIL — `Cannot find module './roles'`.

- [ ] **Step 4: Implement**

```ts
// packages/auth/src/roles.ts
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
```

Confirm `@resonance/core` exports `RoleSchema` and `Role` (it does per the scaffold — `RoleSchema = z.enum(["creator","member"])`). If the export names differ, match them.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @resonance/auth test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
pnpm --filter @resonance/auth typecheck
git add packages/auth/package.json packages/auth/src/roles.ts packages/auth/src/roles.test.ts
git commit -m "feat(auth): roles encode/decode codec for the text roles column"
```

---

### Task 6: `@resonance/auth` — mail resolution (fake + seam)

**Files:**

- Create: `packages/auth/src/mail.ts`
- Test: `packages/auth/src/mail.test.ts`

**Interfaces:**

- Consumes: `MailPort`, `stubMail` from `@resonance/core` (Task 1).
- Produces: `createFakeMail(): { port: MailPort; sent: Array<{ email: string; url: string; token: string }> }` and `resolveMail(): MailPort`. The fake captures sent links; `resolveMail` returns the fake when `RESONANCE_FAKES==="1"`, otherwise `stubMail` (live Resend transport is implemented in Increment 3 when sign-in UX lands).

- [ ] **Step 1: Write the failing test**

```ts
// packages/auth/src/mail.test.ts
import { describe, expect, it } from "vitest";
import { createFakeMail } from "./mail";

describe("fake mail", () => {
  it("captures sent magic links", async () => {
    const { port, sent } = createFakeMail();
    await port.sendMagicLink({ email: "a@b.com", url: "https://x/verify?token=t", token: "t" });
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ email: "a@b.com", token: "t" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @resonance/auth test src/mail.test.ts`
Expected: FAIL — `Cannot find module './mail'`.

- [ ] **Step 3: Implement**

```ts
// packages/auth/src/mail.ts
import { type MailPort, stubMail } from "@resonance/core";

export function createFakeMail(): {
  port: MailPort;
  sent: Array<{ email: string; url: string; token: string }>;
} {
  const sent: Array<{ email: string; url: string; token: string }> = [];
  return {
    sent,
    port: {
      async sendMagicLink(args) {
        sent.push(args);
        // Surface the link in dev so a human can click it without a mailbox.
        if (process.env.NODE_ENV !== "test") {
          console.info(`[fake-mail] magic link for ${args.email}: ${args.url}`);
        }
      },
    },
  };
}

const devFake = createFakeMail();

/** Select the mail transport. Fake under RESONANCE_FAKES; otherwise the stub
 *  (live Resend transport is wired with the sign-in UX in Increment 3). */
export function resolveMail(): MailPort {
  if (process.env.RESONANCE_FAKES === "1") return devFake.port;
  return stubMail;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @resonance/auth test src/mail.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
pnpm --filter @resonance/auth typecheck
git add packages/auth/src/mail.ts packages/auth/src/mail.test.ts
git commit -m "feat(auth): MailPort resolution with capturing fake transport"
```

---

### Task 7: `@resonance/auth` — Better Auth instance + session helper + exports

**Files:**

- Create: `packages/auth/src/auth.ts`, `packages/auth/src/session.ts`
- Modify: `packages/auth/src/index.ts`

**Interfaces:**

- Consumes: `createDb`/`db` and the `Db` type from `@resonance/db`; `resolveMail` (Task 6); `MailPort` from core.
- Produces:
  - `createAuth(opts: { db: Db; mail: MailPort; secret?: string; baseURL?: string }): Auth` — builds a Better Auth instance (injectable for tests).
  - `auth: Auth` — the app singleton (`createAuth({ db: createDb(), mail: resolveMail() })`), constructed lazily to avoid requiring `DATABASE_URL` at import time.
  - `type Auth = ReturnType<typeof createAuth>`.
  - `getSession(headers: Headers)` → `{ user, roles } | null`, decoding the `roles` text column to `Role[]`.

- [ ] **Step 1: Implement `createAuth`**

```ts
// packages/auth/src/auth.ts
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import type { MailPort } from "@resonance/core";
import { createDb, type Db } from "@resonance/db";
import { resolveMail } from "./mail";

export function createAuth(opts: { db: Db; mail: MailPort; secret?: string; baseURL?: string }) {
  return betterAuth({
    secret: opts.secret ?? process.env.BETTER_AUTH_SECRET ?? "dev-insecure-secret-change-me",
    baseURL: opts.baseURL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    database: drizzleAdapter(opts.db, { provider: "pg" }),
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url, token }) => {
          await opts.mail.sendMagicLink({ email, url, token });
        },
      }),
    ],
    user: {
      additionalFields: {
        roles: { type: "string", required: false, defaultValue: "member", input: false },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

// App singleton, built lazily so importing this module doesn't require DATABASE_URL.
let _auth: Auth | undefined;
export function getAuth(): Auth {
  if (!_auth) _auth = createAuth({ db: createDb(), mail: resolveMail() });
  return _auth;
}
```

Note on table names: Better Auth's defaults (`user`/`session`/`account`/`verification`) match our `schema/auth.ts` exactly, so no `schema` mapping is needed in `drizzleAdapter`. If a future rename diverges, pass `drizzleAdapter(db, { provider: "pg", schema: { ... } })`.

- [ ] **Step 2: Implement `getSession`**

```ts
// packages/auth/src/session.ts
import type { Role } from "@resonance/core";
import { getAuth } from "./auth";
import { decodeRoles } from "./roles";

export async function getSession(
  headers: Headers,
): Promise<{ userId: string; email: string; roles: Role[] } | null> {
  const session = await getAuth().api.getSession({ headers });
  if (!session) return null;
  const rolesRaw = (session.user as { roles?: string }).roles;
  return { userId: session.user.id, email: session.user.email, roles: decodeRoles(rolesRaw) };
}
```

- [ ] **Step 3: Update `src/index.ts`**

```ts
// packages/auth/src/index.ts
export type { SessionUser } from "./session-user"; // keep existing type export if present
export { createAuth, getAuth, type Auth } from "./auth";
export { getSession } from "./session";
export { encodeRoles, decodeRoles } from "./roles";
export { createFakeMail, resolveMail } from "./mail";
```

If the existing `SessionUser` type lives directly in `index.ts`, leave it in place and just add the new exports; only re-export from a separate file if it already is one. Match the current file's structure.

- [ ] **Step 4: Typecheck (no behavior test yet — covered by Task 8); commit**

Run: `pnpm --filter @resonance/auth typecheck`
Expected: PASS.

```bash
git add packages/auth/src/auth.ts packages/auth/src/session.ts packages/auth/src/index.ts
git commit -m "feat(auth): Better Auth magic-link instance + session helper"
```

---

### Task 8: `@resonance/auth` — magic-link integration test

Proves the whole auth flow against a real (PGlite) DB with no email: request a magic link → capture the token from the fake transport → verify → get a session whose `roles` decode to `["member"]`.

**Files:**

- Test: `packages/auth/src/auth.test.ts`

**Interfaces:**

- Consumes: `createAuth` (Task 7), `createFakeMail` (Task 6), `createTestDb` from `@resonance/db/testing` (Task 2).

- [ ] **Step 1: Write the integration test**

```ts
// packages/auth/src/auth.test.ts
import { createTestDb, type TestDb } from "@resonance/db/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAuth } from "./auth";
import { createFakeMail } from "./mail";
import { decodeRoles } from "./roles";

describe("magic-link auth (PGlite-backed)", () => {
  let db: TestDb;
  let close: () => Promise<void>;
  beforeEach(async () => {
    ({ db, close } = await createTestDb());
  });
  afterEach(async () => {
    await close();
  });

  it("signs a new user in via magic link and defaults roles to member", async () => {
    const mail = createFakeMail();
    const auth = createAuth({
      db,
      mail: mail.port,
      secret: "test-secret",
      baseURL: "http://localhost:3000",
    });

    // 1. request the link (no email leaves the process)
    await auth.api.signInMagicLink({
      body: { email: "new@user.com", callbackURL: "/" },
      headers: new Headers(),
    });
    expect(mail.sent).toHaveLength(1);
    const token = mail.sent[0]!.token;

    // 2. verify the token -> creates the user + session
    await auth.api.magicLinkVerify({ query: { token } });

    // 3. the user now exists with default roles
    const rows = await db.query.user.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.email).toBe("new@user.com");
    expect(decodeRoles(rows[0]?.roles)).toEqual(["member"]);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm --filter @resonance/auth test src/auth.test.ts`
Expected: PASS. If a method name differs (`signInMagicLink` / `magicLinkVerify`), inspect `auth.api` keys — Better Auth derives them from endpoint paths (`sign-in/magic-link`, `magic-link/verify`). Adjust the calls to the actual names and re-run. Do not move on until green; this test is the schema↔Better-Auth contract check.

- [ ] **Step 3: Commit**

```bash
git add packages/auth/src/auth.test.ts
git commit -m "test(auth): magic-link sign-in→verify integration against PGlite"
```

---

### Task 9: Increment wrap-up — env, diagram, handoff, full green gate

**Files:**

- Modify: `.env.example`, `packages/auth/CLAUDE.md`, `docs/architecture/resonance-architecture.drawio` (+ regenerated `.svg`/`.png`), `HANDOFF.md`

- [ ] **Step 1: Add the fakes flag to `.env.example`**

Add under a new comment block:

```env
# Mock-first runtime seam (ADR-0016). When "1": fake AI/embeddings/email + PGlite.
# Leave unset for live services (requires the keys above).
RESONANCE_FAKES="1"
```

- [ ] **Step 2: Update `packages/auth/CLAUDE.md`**

Replace skeleton language with the real state: Better Auth magic-link over `@resonance/db`, the `MailPort` seam (fake now, Resend later), `roles` stored as comma-encoded text via `encodeRoles`/`decodeRoles`, `getSession()` for RSC/Server Actions, and the `createAuth({ db, mail })` injection seam used in tests. Match the other package CLAUDE.md tone.

- [ ] **Step 3: Update the architecture diagram**

Use the `update-architecture-diagram` recipe (`.claude/skills/update-architecture-diagram`). Edit `docs/architecture/resonance-architecture.drawio`: drop the stub/dashed styling on `@resonance/db` and `@resonance/auth` (now real), and show the Neon + (deferred) Resend external dependencies and the auth→db / db→Neon data flows. Then run the recipe's validate + regenerate (SVG/PNG) steps and self-check the rendered PNG. If the `drawio` CLI is unavailable in this environment, stop and report it rather than committing a stale diagram.

- [ ] **Step 4: Update `HANDOFF.md`**

Move Increment 1 (data + auth) from "next" to "done", noting: real `@resonance/db` (schema + pgvector + queries + PGlite harness) and `@resonance/auth` (magic-link), mock-first verified, and that Increment 2 (AI layer) is next and needs its own plan.

- [ ] **Step 5: Run the full gate**

Run: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`
Expected: all PASS (the format-on-save hook keeps formatting clean; if `pnpm format:check` is part of CI, run it too).

- [ ] **Step 6: Commit**

```bash
git add .env.example packages/auth/CLAUDE.md docs/architecture HANDOFF.md
git commit -m "chore: close Increment 1 (data + auth) — env flag, diagram, handoff"
```

---

## Self-Review

**Spec coverage (Increment 1 scope):**

- Drizzle client + `users`/`creator_profiles`/`embeddings` schema + pgvector → Tasks 2–4. ✓
- Generic `(sourceType, sourceId, model)` embeddings table with HNSW + unique → Task 2 (schema), Task 3 (upsert/query). ✓
- Offerings as jsonb (YAGNI) / no transcript table → Task 2 schema (no transcript/offerings table created). ✓
- Better Auth magic-link, self-hosted on our DB, roles via core `Role` → Tasks 5, 7, 8. ✓
- `MailPort` (Resend behind an interface; fake for tests) → Tasks 1, 6 (live Resend explicitly deferred to Increment 3 — noted). ✓
- DB test strategy via PGlite + pgvector → Task 2 harness, used in Tasks 2/3/8. ✓
- Driver-agnostic `Db` type so the same queries run on Neon and PGlite → Task 2. ✓
- `RESONANCE_FAKES` seam (ADR-0016) → Task 6 (`resolveMail`) + Task 9 (`.env.example`). The ADR-0016 file itself + the AI/embeddings/email fakes it governs are authored in Increment 2/3 where those services first appear; Increment 1 only introduces the flag for mail. ✓
- Maintenance contract (diagram, package CLAUDE.md, HANDOFF) → Tasks 4, 9. ✓

**Out of scope (correctly deferred to later increments):** the runner/gateway/agents, embeddings _generation_ (only storage/query here, with hand-built vectors in tests), live Resend transport, ADR-0016 file authoring, UI, routes, Server Actions, E2E.

**Placeholder scan:** No "TBD/handle errors/etc." — every code and test step has complete content. The two soft spots are flagged with concrete fallbacks: Better Auth `auth.api` method names (Task 8 says how to confirm) and the drawio CLI availability (Task 9 says to report if absent).

**Type consistency:** `Db` is the shared param type across all query functions and `createAuth`; `TestDb` (from `@resonance/db/testing`) is used in every integration test; `Role`/`RoleSchema` come from `@resonance/core` and flow through `encodeRoles`/`decodeRoles`; `vector(1024)` and model string `"voyage-3.5"` are consistent across schema and tests; `MailPort` is defined once (core) and consumed everywhere. `createAuth` signature in Task 7 matches its call in Task 8.

## Execution Handoff

(Selected after the plan is reviewed — see the message accompanying this plan.)
