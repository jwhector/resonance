# @resonance/db

The single data-access layer: Drizzle ORM over Neon Postgres, with pgvector for
embeddings (ADR-0004, ADR-0010). **Every** DB read/write in the system goes through
here — no other package opens a connection.

## Status: REAL

Schema, client, migrations, and query helpers are all in place (Creator Interview →
ProfileGen reference slice — see `docs/superpowers/specs/2026-06-17-creator-interview-profilegen-design.md`).

## What's here

```
src/
├── client.ts                   createDb() — Neon serverless HTTP driver (production)
├── types.ts                    type Db — union type for Neon (prod) + PGlite (test)
├── schema/
│   ├── auth.ts                 Better Auth tables: user, session, account, verification
│   ├── community.ts            follows (user → user follow graph)
│   ├── creator.ts              creator_profiles, embeddings (+ Zod schemas)
│   ├── interests.ts            topics (curated taxonomy), member_interests (member → topic)
│   ├── weave-observation.ts    weave_observations, weave_evaluations,
│   │                           weave_evaluation_scores, weave_limitation_verdicts
│   ├── weave-pattern.ts        weave_patterns, weave_pattern_evidence (+ Zod schemas)
│   └── index.ts                re-exports the schema files
├── queries/
│   ├── discovery.ts            searchCreatorProfiles — THE deep ANN read (see below)
│   ├── follows.ts              followCreator, unfollowCreator, getFollowStates
│   ├── interests.ts            listTopics, getMemberInterests, setMemberInterests,
│   │                           getMemberInterestEmbedding
│   ├── observations.ts         insertObservations, insertEvaluation — the atomic
│   │                           evidence writes (see below)
│   ├── profiles.ts             createCreatorProfile, getCreatorProfileById,
│   │                           getCreatorProfileByUserId, upsertProfileEmbedding,
│   │                           findSimilarProfiles (thin wrapper — see below)
│   └── users.ts                setUserRoles, setOnboardingIntent — the single write
│                               paths for user.roles and user.onboarding_intent
├── adapters/
│   ├── discovery-adapter.ts    createDiscoveryAdapter — core's DiscoveryPort, live impl
│   └── observation-adapter.ts  createObservationAdapter — core's ObservationPort, live impl
└── testing/
    └── create-test-db.ts       createTestDb() — PGlite in-memory harness (dev/test only)
drizzle/
    0000_enable_pgvector.sql    Hand-written: enables pgvector extension (runs first)
    0001_pink_stone_men.sql     drizzle-kit generated: auth + creator_profiles + embeddings
    0002_yellow_changeling.sql  drizzle-kit generated: unique index on creator_profiles.user_id
    0003_green_ultimo.sql       drizzle-kit generated: follows table + discovery indexes
    0004_motionless_bastion.sql drizzle-kit generated: Weave OS evidence + pattern records
    0005_rapid_ogun.sql         drizzle-kit generated: topics + member_interests,
                                embeddings.source_id widened uuid → text
    0006_seed_topics.sql        Hand-written (--custom): the 13 curated topic rows
    0007_nifty_the_watchers.sql drizzle-kit generated: user.onboarding_intent
```

## Public API

Import from `"@resonance/db"` for production code; `"@resonance/db/testing"` for tests.
The `./testing` subpath is behind a separate package.json export so PGlite never lands
in production bundles.

**`@resonance/db`** — main entrypoint (`src/index.ts`):

```ts
export * from "./schema"; // tables + Zod schemas (OfferingSchema, etc.)
export type { Db } from "./types"; // union Drizzle type (Neon | PGlite)
export { createDb } from "./client"; // production client factory
export {
  createCreatorProfile,
  getCreatorProfileById,
  getCreatorProfileByUserId, // by OWNER, not by profile uuid — sessions/follows carry user ids
  upsertProfileEmbedding,
  findSimilarProfiles,
  type CreatorProfileRow,
} from "./queries/profiles";
// Two separate columns, two separate write paths: earned status vs. stated intent.
export { setUserRoles, setOnboardingIntent } from "./queries/users";

// Discovery (Slice A)
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
export {
  followCreator,
  unfollowCreator,
  getFollowStates,
  type FollowEdge,
} from "./queries/follows";

// Member interests (Slice B) — same precedent as follows: writing an interest is not ranking.
export {
  listTopics,
  getMemberInterests,
  setMemberInterests,
  getMemberInterestEmbedding,
  type InterestEmbedder,
  type SetMemberInterestsArgs,
} from "./queries/interests";

// Weave OS evidence capture (ADR-0020)
export { insertObservations, insertEvaluation } from "./queries/observations";
export {
  createObservationAdapter,
  type ObservationAdapterDeps,
} from "./adapters/observation-adapter";
```

### Discovery — one query, eight invariants

`searchCreatorProfiles(db, args)` is the **only** ANN read over creator profiles. It owns
every rule that makes discovery correct: the `status = 'ready'` filter, the
`assertEmbeddingDims` guard, conjunctive `tags @>` containment, the similarity floor,
`similarity DESC, id ASC` ordering, keyset pagination, and per-viewer follow state. Do not
write a second one — add an argument.

Personalized ranking (invariant 8) is **not** a second query. `createDiscoveryAdapter`
resolves the query vector from one of two sources — the embedded search text, or the
viewer's stored interest vector when `query.text` is absent — and both flow into the same
call, which is what makes invariants 2–7 hold on the personalized branch for free. No
viewer, or a viewer with no stored vector, returns an **empty page**: "we have nothing to
personalize on" and "here is everything" are different answers and only the first is honest.
A typed query always wins over stored interests — it is the more current signal.

Two things depend on that being singular:

- **`findSimilarProfiles(db, embedding, limit = 10)` is a thin wrapper over it, and its
  signature is frozen.** `scripts/verify-live.mjs` proves a committed profile landed by
  reading it back through this exact call (ADR-0018 live-smoke, mulch `mx-880c8a`) — a
  credential-gated path CI normally skips, so a rename breaks the release gate silently.
  Treat that script as part of this package's public surface and grep it before touching
  the module.
- **`createDiscoveryAdapter({ db, embed })` is the live `DiscoveryPort`** (ADR-0017). The
  `embed` function is **injected**, never imported: the dependency runs `ai → db`, so this
  package must not know Voyage exists. Wire it in the app layer with
  `(text) => resolveEmbedder().embed(text)`.

A wrong-width vector does **not** error inside pgvector — it silently matches nothing,
which reads as "no results" rather than "misconfigured embedder" (ADR-0010). That is why
the width is asserted at the seam before any SQL runs, and why a test feeds a short vector
and asserts the _throw_.

### Evidence capture — atomic without a transaction

`createObservationAdapter({ db })` is the live `ObservationPort` (ADR-0017, ADR-0020). It
takes **only** `db`, and that is the point: the port forbids an adapter from substituting a
"current" corpus release for a missing one, so the adapter is given nothing it could
substitute. A release id can only come from the evidence itself.

Both writes must be all-or-nothing — a conversation's observations together, an evaluation
with all sixteen scores and every limitation verdict. Half-written evidence reads as a real
measurement while silently under-counting, which is worse than no evidence at all.

**Neither driver can express that as a transaction.** Neon's HTTP driver throws on
`db.transaction()` (ADR-0004) and PGlite has no `db.batch()` — the two are disjoint. The one
mechanism both share is Postgres itself: every single statement runs in its own implicit
transaction. So each write in `queries/observations.ts` compiles to exactly **one statement**:

- `insertObservations` is one multi-row `INSERT`.
- `insertEvaluation` puts the evaluation (and the verdicts, when there are any) in
  data-modifying `WITH` clauses and makes the sixteen scores the main insert. Postgres runs a
  `WITH` clause exactly once and to completion, and the child rows' foreign keys resolve
  because Postgres checks them after the statement finishes. The scores are the main insert
  because they are the only part guaranteed non-empty.

Row ids are generated in the helper rather than read back from `RETURNING`. That is what makes
"one id per observation, in the order supplied" true by construction, and what lets an
evaluation's children reference their parent inside one statement with no round trip.

`commitCreatorProfile` in `@resonance/ai` solves the same no-transaction constraint the other
way — ordering independent writes so a failure leaves a coherent state. Use ordering when the
writes can stand alone; use one statement when they cannot.

The PGlite test harness is exported ONLY from the `@resonance/db/testing` subpath
(keeps PGlite out of production bundles) — it is not part of the main entrypoint.

**`@resonance/db/testing`** — separate import path (`src/testing/create-test-db.ts`):

```ts
export { createTestDb, type TestDb } from "./testing/create-test-db";
```

## Tables

### Better Auth tables (`schema/auth.ts`)

`user`, `session`, `account`, `verification` — singular names are the **sanctioned
naming exception**: Better Auth owns these shapes and names. PKs are `text` (Better
Auth generates string IDs, not UUIDs). The `user` table adds a `roles` column
(`text`, comma-encoded `Role[]`, default `"member"`) as a Better Auth `additionalField`.

It also carries **`onboarding_intent`** (`text`, one of `@resonance/core`'s
`ONBOARDING_INTENTS`) — what the person said they came here to do on the first onboarding
screen. Two things about it are deliberate:

- **It is not a Better Auth `additionalField`, and must not become one.** `roles` is declared
  there only because `getSession` decodes it into `SessionUser`; nothing in the auth flow
  reads the intent, so it stays out of the session payload. It is our column on their table,
  written and read through Drizzle.
- **Nullable, no default, no backfill.** Intent is what someone _said_; `roles` is status they
  _earned_ by completing creator onboarding (which is why `commitCreatorProfile` writes the
  role last). A null intent means "never answered" — every user predating the screen — and a
  default would fabricate an answer indistinguishable from a real one.

`setOnboardingIntent(db, userId, intent)` is the only write path. It validates through
`OnboardingIntentSchema` because both callers get the value from something a person can type
(signup reads it off a URL; the member → creator conversion screen posts a form), and it
overwrites: the question is asked more than once and the latest answer is the true one.
Overwriting is safe precisely because intent is not status — it cannot demote anyone.

### `creator_profiles` (`schema/creator.ts`)

`uuid` PK, `userId` (FK → `user.id`, text), `displayName`, `headline`, `bio`,
`tags` (jsonb `string[]`), `offerings` (jsonb `Offering[]`), `status`
(`"draft" | "ready"`), timestamps. Unique index on `userId`
(`creator_profiles_user_id_uq`) — one profile per user, so `createCreatorProfile`
upserts on conflict (idempotent under model retry / profile regeneration).
Accompanying Zod schemas: `OfferingSchema`, `ProfileStatusSchema`,
`CreatorProfileInputSchema`.

Two more indexes serve discovery's `WHERE` clauses: `creator_profiles_status_idx`
(btree on `status`) and `creator_profiles_tags_idx` (GIN `jsonb_path_ops` on `tags`,
the opclass for the `@>` containment the tag filter issues).

**`status` is a visibility rule, not a flag.** `"draft"` means the owner has not
published; every discovery read filters `status = 'ready'`. Direct lookups
(`getCreatorProfileById` / `ByUserId`) deliberately do **not** filter — the owner must
be able to see their own draft.

### `follows` (`schema/community.ts`)

`followerId` / `followingId` (both `text` FK → `user.id`, `ON DELETE CASCADE`) +
`createdAt`. Composite PK `(follower_id, following_id)` is the row's whole identity: it
makes `followCreator` idempotent via `onConflictDoNothing` and indexes the
"does A follow B" direction. `follows_following_idx` serves the reverse (follower counts).

The edge is **user → user, not user → profile**: a creator profile is a regenerable
projection of a user (`createCreatorProfile` upserts on `user_id`), and following is a
member-to-member capability the moment the community slice grows. Self-follows throw
`ResonanceError("follow_self")` rather than hitting a CHECK constraint, so the web layer
gets a typed error instead of an opaque driver one.

### `topics` / `member_interests` (`schema/interests.ts`)

The member-side counterpart to `creator_profiles`: a creator says what they offer, a member
picks topics, and both become vectors in the same space so the two can be matched.

**`topics`** is the curated taxonomy the interest picker renders (Figma `1554:79520`) — the
13 unique topics the frame draws, seeded by migration `0006_seed_topics` with
`ON CONFLICT DO NOTHING`. A **table rather than a constant** so the list can be corrected or
extended as a data edit instead of a migration; seed-once, not enforce-forever. The **slug is
the primary key**, matching `TopicSlugSchema` in `@resonance/core`: a topic is identified by
slug at every boundary that carries it (`ui` chip → `web` form → this row), so a surrogate id
would only give each of those boundaries something to resolve. `sortOrder` carries the frame's
chip order, which is a design decision and has nowhere else to live.

**`member_interests`** is `(member_id, topic_slug)` + `createdAt`, shaped after `follows` for
the same reasons: the composite PK is the row's whole identity, which makes re-submitting a
selection idempotent and indexes "what does this member care about" for free.
`member_interests_topic_idx` serves the reverse direction and keeps the `topic_slug` foreign
key's referential check off a sequential scan when the taxonomy is edited. Both FKs cascade.

`setMemberInterests` **replaces** a selection rather than merging — the picker submits a whole
selection, so dropped topics must actually go — and writes in a deliberate order, because
neither driver can span statements atomically: embed first (an embedder outage leaves storage
untouched), then the rows (the durable fact), then the vector (a projection recomputable from
it). Each write is one statement, using the same data-modifying-`WITH` trick as
`queries/observations.ts`, with the `DELETE` scoped to rows the `INSERT` does not touch.

An **empty selection is a real outcome, not a no-op**: the picker is skippable, so submitting
nothing clears both the rows and the vector, and the embedder is never called.

### `embeddings` (`schema/creator.ts`)

Generic, polymorphic vector store. Columns: `sourceType` (open-ended enum),
`sourceId` (id of the source row, as text), `model` (embedding model ID), `content` (text
that was embedded), `embedding` (`vector(1024)`). Unique index on
`(sourceType, sourceId, model)` so `upsertProfileEmbedding` is idempotent.
HNSW index (`vector_cosine_ops`) for ANN search.

**`source_id` is `text`, not `uuid`** — the column is polymorphic in **id shape** as well as in
source. A creator profile is addressed by a uuid; a member's interest vector is keyed to their
Better Auth user id, which is text. A uuid column can hold one of those and not the other, so
the wider type wins (migration `0005`, `ALTER COLUMN ... TYPE text`, which preserves existing
uuids in canonical form). Two consequences worth knowing:

- Comparisons are now **exact text comparisons**. A uuid-shaped source id must be stored
  canonical lower-case hyphenated — which is what Postgres returns from a uuid column, and
  therefore what every writer already passes.
- `searchCreatorProfiles` joins with `creator_profiles.id::text = embeddings.source_id`. The
  cast goes on the **uuid side deliberately**: `source_id::uuid` would raise a syntax error the
  moment the planner evaluated it against a non-uuid source id such as an interest row, and
  nothing in SQL guarantees the `source_type` filter is applied first.

**`"creator_profile"` and `"interest"` vectors are produced today.** The `profile-gen`
`saveProfile` tool embeds a generated profile via `@resonance/ai` and writes it through
`upsertProfileEmbedding`; `setMemberInterests` writes the interest vector, of which a member has
**exactly one** (the write prunes any row under a different model, so the read never has to
choose between two). The remaining values in `EMBEDDING_SOURCE_TYPES` (`"offering"`, `"post"`)
are reserved for future slices — see _Future evolution_ in the design spec.

**Embedding dimensions are pinned to 1024** — matching Voyage `voyage-3.5`, the
model used by `@resonance/ai`. The column takes its width from `EMBEDDING_DIMS` in
`@resonance/core`, not a literal, so the column, the embedder, and the query-time guard
cannot drift apart. Changing the width means changing it there (and writing a migration).

### Weave OS evidence (`schema/weave-observation.ts`) — ⏸ DEFERRED

**Deferred 2026-07-28.** These tables and the `ObservationPort` adapter are shipped and
tested, but **nothing writes to them** — the evidence loop that would fill them (waves 3–4 of
plan `pl-9c75`) was never built. Migration `0004` is committed; check whether it has been
applied to your Neon branch before assuming either way. Context: seed `resonance-5c86` and
the `architecture` mulch decision. Leave dormant unless Jared says otherwise.

Four append-only tables behind the `ObservationPort`. The shapes are defined in
`@resonance/core`'s `weave-observation.ts`; this is only where they land.

- **`weave_observations`** — one recorded moment: `osReleaseId`, `conversationId`, `flowId`,
  nullable `stageId`, `category`, `signal`, optional `detail`, `evidenceSource`, `observedAt`
  (when it happened, supplied) and `recordedAt` (when the row landed). Indexed on release,
  `(conversation_id, observed_at)`, `(flow_id, stage_id)`, `(category, signal)`, and
  `evidence_source`.
- **`weave_evaluations`** — one scored assessment of a conversation. Deliberately **not**
  unique on `conversation_id`: re-scoring inserts another row, so two scorings disagreeing
  stays visible.
- **`weave_evaluation_scores`** — sixteen rows per evaluation, unique on
  `(evaluation_id, dimension)`, with a CHECK pinning the score to the corpus's 0–3 scale. Rows
  rather than sixteen columns because promoting a new interaction principle adds a
  seventeenth dimension, and that should cost evidence, not a migration.
- **`weave_limitation_verdicts`** — `limitationId` + a **boolean** `held` + optional evidence.
  Its own table with no score column, because a limitation is an invariant and "mostly held"
  is a breach. Keeping it out of the scores is what stops a violation being averaged away.

**`os_release_id` has no default anywhere.** Evidence that cannot name the corpus release that
produced it is worthless, and evidence that names the wrong one is worse. `NOT NULL` with
nothing to fall back on means no write path can invent an attribution; `insertObservations` /
`insertEvaluation` additionally reject a blank one, which `NOT NULL` would happily accept.

### Weave pattern registry records (`schema/weave-pattern.ts`)

The **records** half of the Pattern Registry (ADR-0020 §4). The **rulebook** — promotion
destinations, thresholds, metric definitions — is corpus YAML in `@resonance/weave-os` and is
not duplicated here. Nothing in these tables is ever inherited into a runtime prompt.

- **`weave_patterns`** — one row per corpus pattern id (unique on `pattern_id`, uuid surrogate
  PK, same split as `creator_profiles`): lifecycle, scope, the observation with its signals and
  candidate responses, evidence confidence and notes, classification rationale, and promotion
  state. Indexed on `lifecycle_status`, `promotion_decision`, `evidence_confidence`.
- **`weave_pattern_evidence`** — the FK link from a pattern to the observations cited for or
  against it (`stance`: supporting / contradicting). Unique on `(pattern_id, observation_id)`
  so a replayed import cannot inflate a count.

Two deliberate shape decisions:

- **The two metric maps are `jsonb`, not nineteen integer columns** (ten evidence counts, nine
  classification scores). The metric names are the rulebook's to define; a column each would
  make this schema a second, silently divergent copy of that list, and adding a metric would
  cost a migration instead of a corpus edit. `PatternEvidenceMetricsSchema` and
  `PatternClassificationScoresSchema` type them at the boundary. The registry holds tens of
  rows, so the scans this implies cost nothing worth a column for.
- **Enumerated where the registry enumerates, plain text where it does not.** Lifecycle status
  (seven) and promotion target (four) are named outright in the source, so they are unions.
  `promotion_readiness`, `promotion_decision`, `discovered_during` and
  `current_scope_hypothesis` have exactly one attested value each and no declared set, so they
  carry the author's value as text rather than a guessed enum.

Fields the registry attributes to the Evolution Engine's Architect and Validator — proposed
destination, validation results, regression findings, risk assessment — are **absent on
purpose**. Those entities are out of scope (ADR-0020), and columns nothing writes would be a
guess about a design that does not exist yet.

## Migrations

- Generated with `drizzle-kit generate` (`pnpm db:generate`) and committed alongside
  the schema change. Use the `add-db-migration` recipe.
- **Never hand-edit generated SQL** without noting it explicitly. When you genuinely need
  SQL drizzle-kit cannot generate, run `drizzle-kit generate --custom --name <name>` — it
  prepares an empty file **and** registers the journal entry + snapshot, so the next
  `db:generate` still diffs correctly. Two files use it: `0000_enable_pgvector.sql` (the
  `vector` extension must exist before any `vector(...)` column) and `0006_seed_topics.sql`
  (curated reference data — drizzle-kit generates schema, not data).
- Applied in production with `pnpm db:migrate` (runs `drizzle-kit migrate` against
  `DATABASE_URL`). Applied in tests automatically by `createTestDb()` via the
  `drizzle-orm/pglite/migrator`.

## Neon in prod / PGlite in tests

| Context    | Driver                          | How                                                   |
| ---------- | ------------------------------- | ----------------------------------------------------- |
| Production | `@neondatabase/serverless` HTTP | `createDb(connectionString)` → `NeonHttpDatabase`     |
| Tests      | `@electric-sql/pglite`          | `createTestDb()` → in-memory, migrations auto-applied |

`type Db` covers both via `PgDatabase<PgQueryResultHKT, typeof schema, ...>`. Pass
a `Db` into query helpers rather than the singleton so tests can inject `TestDb`.

## Rules

- Import only from the package's public entrypoint. Never reach into `src/` internals.
- Query helpers take `Db` as their first argument — dependency-injectible for tests.
- Tables are `snake_case` (Postgres) with Drizzle `camelCase` keys (JS). Index every
  column used in a `WHERE` or `JOIN`.
- `zod` is a direct dependency (boundary validation of insert shapes). Schema-level Zod
  schemas live in `schema/*.ts` alongside the Drizzle table definitions.
- Depends only on `@resonance/core`. Domain packages depend on this; it does not depend
  on any domain package.
- No `any`. Use `import type` / `export type` for type-only imports/exports.

## Working here (seeds + mulch)

Work in this package is tracked by a `db`-labelled seed — `sd ready` / `sd search db` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`db`** mulch domain: `ml record db --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
