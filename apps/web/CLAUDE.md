# web (apps/web)

The Next.js App Router **shell**: UI composition, routing, and wiring only. It imports
the `@resonance/*` packages and renders them — it holds **no domain logic** (ADR-0002).
Logic that feels like it belongs here almost always belongs in a package, so it stays
extraction-ready.

## Status: three slices live

- **Staged creator onboarding** (ADR-0022; replaces the free-form chat slice of ADR-0013) —
  `/onboarding/creator` resumes or starts the creator's server-side session in the RSC and renders
  `@resonance/ui`'s `CreatorOnboardingStage`. Every press goes through one Server Action,
  `transitionCreatorOnboarding`, which parses a `TransitionCommand`, takes identity from the
  session and calls `@resonance/ai`'s onboarding service; stage rules, generation, saves and the
  one-statement publish all live behind that call. Finish for now navigates to the published
  profile.
- **Member discovery core** (`pl-bbca`) — `/discover`: session-optional ranked creator search
  over `@resonance/core`'s `DiscoveryPort`, plus follow/unfollow. Creators is the only tab with
  a data source; the other three render designed empty states.
- **Member interests** (`pl-496f`) — `/interests` after email verification, for **every** newly
  verified account (roles are additive, so a creator is also a member). Submission is the form's
  **native `action`**, so the step works with JS disabled; `onSubmit` only marks it in flight.
  Pressing Continue with nothing selected is a **valid empty selection**, which is how "skip"
  works without inventing a control the design does not draw. The step is also where the
  `/start` answer is **spent**: it rides the URL through sign-up and **both** verification
  channels (every intent-carrying URL is built in `(onboarding)/intent-routes.ts`, so the
  channels cannot drift), is persisted via `setOnboardingIntent` against the same member in the
  same submission, and picks the exit — a creator intent (`share`/`business`) continues to
  `/onboarding/creator`; anything else, including no answer or a forged value, lands `/discover`
  with nothing written. On `/discover`, an **empty query
  plus a signed-in viewer** omits `text` so the port ranks on stored interests instead
  (`DiscoveryPort` invariant 8); signed out, it is not asked at all. `idle` therefore now means
  "nothing searched **and** nothing to suggest", still distinct from `no-results`.

Commerce/community routes are still unbuilt; the scaffold home page remains.

## What's here

```
app/
├── (onboarding)/start           intent fork ("What brought you?", IntentPickerCard) → /signup?intent=… or /discover
├── (onboarding)/intent-routes.ts every intent-carrying onboarding URL, built in one place so the
│                                 two verification channels cannot drift apart
├── (onboarding)/signup, verify   passwordless front door (form + Better Auth); both channels carry
│                                 the /start intent through to /interests
├── (onboarding)/interests/       interest selection (TopicPicker) — EVERY newly verified account
│                                 passes through here; stores the /start intent and forks the exit;
│                                 page.tsx · interests-form.tsx · actions.ts
├── (app)/layout.tsx              THE SHARED APP SHELL — the 80px `AppNav` rail, once, for
│                                 every in-app route. Adds no URL segment.
├── (app)/discover/               member discovery: page.tsx (RSC, URL state) ·
│                                 discover-client.tsx · actions.ts · contracts.ts
├── (app)/onboarding/creator/     staged interview: page.tsx (RSC open/resume) · onboarding.ts
│                                 (composition root) · actions.ts (the one transition action) ·
│                                 onboarding-client.tsx
├── (app)/creator/[id]/           published creator profile (name, headline, bio, offerings, tags)
├── api/auth/[...all]/            Better Auth mount (via lib/auth.ts getWebAuth)
├── api/test/last-otp/            E2E-ONLY OTP read-back — gated on E2E_HARNESS
├── api/test/last-magic-link/     E2E-ONLY magic-link read-back — same gate, other channel
└── layout.tsx · page.tsx · globals.css
lib/
├── auth.ts            getWebAuth() (the one instance the mount serves) + getWebSession() — all
│                      apps/web session reads route through it, so ONE instance runs per process
├── e2e-harness.ts     the SINGLE, production-guarded E2E fake-selection seam (ADR-0018)
├── auth-client.ts
e2e/
├── onboarding-creator.spec.ts    full-flow Playwright (runs under E2E_HARNESS)
├── discovery.spec.ts             member discovery front door + follow/unfollow (E2E_HARNESS)
├── interests.spec.ts             pick topics → interest-ranked /discover, and the skip path
├── onboarding-intent.spec.ts     the /start intent through BOTH verification channels — where
│                                 /interests lets out, and that the answer is persisted
├── home.spec.ts                  scaffold smoke test
└── lib/                          signup.ts — the shared passwordless front door (either channel),
                                  driven to /interests, and the account ledger it tears down
                                  · db.ts — fixture DB plumbing · discovery-fixtures.ts
                                  — ready/draft creator profiles · discovery-query.ts — the
                                  run-scoped query text those profiles embed, database-free so
                                  discovery-query.test.ts (Vitest) can pin the ranking margin
                                  · interest-fixtures.ts — the creator seeded to match a
                                  member's interest text exactly
```

The two runners split `e2e/` by filename, not by directory: Playwright collects only `*.spec.ts`
and Vitest excludes only those, so a fixture helper under `e2e/lib` can carry a plain `*.test.ts`
unit test (`playwright.config.ts`, `vitest.config.ts`).

Fixture cleanup lives in `afterEach`, never a `finally` inside a test: Playwright aborts the test
body on a timeout, so a `finally` there silently leaks rows into the shared dev database — the
cause behind seed `resonance-1236`. Signed-up accounts are not a spec's bookkeeping either: the
signup helper records each address the moment it mints one — before the account can exist — and
specs wire its `deleteSignedUpAccounts` as their `afterEach`, so a timeout inside sign-up cannot
orphan a row nothing can name.

Depends on every `@resonance/*` package plus `next`, `react`, `@tanstack/react-query`,
and `zod`.

## Testing (ADR-0018)

- The shell consumes the `@resonance/*` **live-by-default** seams; there is **no
  `RESONANCE_FAKES` branch** in shipped code. Unit/RTL tests inject fakes via DI (mocking the
  `@resonance/ai` entrypoint, passing `ctx.embedder`), never an env flag.
- The full-flow Playwright E2E stays deterministic through ONE isolated seam —
  [`lib/e2e-harness.ts`](lib/e2e-harness.ts) (`E2E_HARNESS=1`, hard-guarded off in production) —
  which injects the test-only fakes (`@resonance/ai/testing`, `@resonance/auth/testing`) at the
  composition roots (foundation generation, the profile embedder, and the auth mount). It
  is **not** a general fakes flag threaded through the packages (ADR-0018 §4). The harness fake mail
  is a `globalThis` singleton and registers its buffers for read-back with **explicit**
  `observeLoginCodes(fake)` and `observeMagicLinks(fake)` calls (never a construction side-effect),
  so building a fake — or a session read via `getWebSession` — can't clobber the
  `/api/test/last-otp` or `/api/test/last-magic-link` read-backs (seed resonance-5d4e). Two calls
  because sign-up dispatches both emails — why they stay separate is in `@resonance/auth`'s
  CLAUDE.md. The slot holds the **in-flight promise**, not the resolved port, so the parallel
  auth requests the signup form fires share one construction instead of each building a fake on a
  cold server (seed resonance-86dd). Session reads go through `getWebSession` → `getWebAuth`, so the mount and the
  reads share ONE Better Auth instance per process (seed resonance-eb15).
- **Manual live runs** use the same dev server with no harness (`pnpm --dir apps/web dev` reads
  `apps/web/.env.local`). Two things to know: Resend's shared test sender only delivers to the
  Resend account owner's own address, so sign up with that address (or set `RESEND_FROM_EMAIL` to
  a verified domain); and an account that finished the creator interview cannot walk it again, so
  `pnpm onboarding:reset -- --email <address>` (`scripts/reset-creator-onboarding.mjs`; the pnpm
  script loads `apps/web/.env.local` for `DATABASE_URL`) deletes its onboarding session, creator profile, embedding and `creator` role
  to put it back at the opening. A failed foundation generation is logged by the composition
  root's `onGenerationFailed` reporter; the creator only sees "try again".
- Live wiring is proven by the credential-gated **`verify:live`** smoke gate (`pnpm verify:live`,
  ADR-0018 §3): one real model call + embedding + email + DB write. It **skips** (exit 0) with no
  credentials, so the fast inner loop stays free and deterministic.

## Rules

- **Thin shell (ADR-0002).** Compose and render; never put domain rules here. If you
  reach for business logic, move it into the relevant package and import it.
- **Import from package public entrypoints only** (`@resonance/x`), never their `src/`
  internals — the boundary is enforced by lint.
- **Validate every boundary with Zod** — Server Action inputs, route handler payloads,
  external webhooks. Types are not validation (golden rule 3).
- **Secrets + AI orchestration stay server-side** — RSC, Server Actions, route handlers
  only. Never ship a provider key or run an agent on the client (golden rule 4).
- **RSC + Server Actions by default; TanStack Query only where interactive** (ADR-0008).
- New behavior ships with tests — RTL for components, Playwright for flows (ADR-0011).
- **Viewer identity comes from the session, never from the payload.** Server Actions that act
  for a user resolve them with `getWebSession` and keep them out of the Zod-parsed input — see
  `(app)/discover/actions.ts`, where `DiscoveryPort.searchCreators(query, viewer)` takes them as
  separate parameters so there is no identity field on the query to spoof.
- **A new in-app route goes under `app/(app)/`**, so it inherits the shared `AppNav` shell
  rather than re-composing it. Screens with their own full-page chrome (the `(onboarding)`
  group) stay outside. Any route that reads a live DB sets `force-dynamic` and calls
  `createDb()` lazily inside the handler.

## Working here (seeds + mulch)

Work in the web shell is tracked by a `web`-labelled seed — `sd ready` / `sd search web` to find it, then `sd update <id> --status in_progress` to claim it. Before closing, record any non-obvious learning to the **`web`** mulch domain: `ml record web --type <convention|pattern|failure|decision> --description "..." --evidence-seeds <id>`. Full loop: root CLAUDE.md → _Agentic workflow_ (ADR-0016).
