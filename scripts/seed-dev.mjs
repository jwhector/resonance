// Seed the DEV database with a realistic, browsable cast of creators so `/discover` can be
// judged as a product rather than as a query that returns rows.
//
//   pnpm db:seed                 # live embeddings (needs a working Voyage/Gateway key)
//   E2E_HARNESS=1 pnpm db:seed   # deterministic fake embeddings — NO provider spend
//   pnpm db:seed --clean         # remove everything this script created
//
// ## Why this exists
//
// The dev database accumulated ~24 committed profiles from `verify:live` and onboarding runs,
// nearly all of them literally named "New Creator" with two recycled headlines. Discovery worked
// against them, but the screen was unjudgeable. The E2E fixtures (`apps/web/e2e/lib/
// discovery-fixtures.ts`) are deliberately test-scoped — per-worker ids, deleted in `afterAll` —
// so they cannot fill this role. This script writes DURABLE rows instead.
//
// ## Embedder selection mirrors the app
//
// A seeded profile is only discoverable if its embedding lives in the SAME vector space as the
// query embedding, and `apps/web/lib/e2e-harness.ts` swaps the embedder on `E2E_HARNESS`. So this
// script reads the same switch: run it with `E2E_HARNESS=1` and serve the app the same way to get
// a coherent, credential-free local setup; run both without it for live Voyage vectors. Mixing the
// two produces rows that are present but ranked meaninglessly — the failure is silent, which is
// why the mode is echoed on every run.
//
// ## Idempotence
//
// Every row carries a deterministic `seed-dev-*` id. Users upsert, profiles upsert on their unique
// user_id, and embeddings upsert on (source_type, source_id, model) — so re-running converges
// rather than duplicating, and `--clean` removes exactly this cast and nothing else.

const CLEAN = process.argv.includes("--clean");
const HARNESS = process.env.E2E_HARNESS === "1";

// Credential gate FIRST, before any import, so a misconfigured shell fails with a sentence rather
// than a module resolution error (same discipline as scripts/verify-live.mjs).
if (!process.env.DATABASE_URL) {
  console.error(
    "db:seed needs DATABASE_URL.\n" +
      "  DATABASE_URL=\"$(grep '^DATABASE_URL=' apps/web/.env.local | cut -d= -f2-)\" pnpm db:seed",
  );
  process.exit(1);
}
if (!HARNESS && !process.env.AI_GATEWAY_API_KEY && !process.env.VOYAGE_API_KEY) {
  console.error(
    "db:seed needs an embedding provider (AI_GATEWAY_API_KEY or VOYAGE_API_KEY),\n" +
      "or run it credential-free with the deterministic fake embedder:\n" +
      "  E2E_HARNESS=1 pnpm db:seed   # then serve the app with E2E_HARNESS=1 too",
  );
  process.exit(1);
}

const { register } = await import("tsx/esm/api");
const tsxHandle = register();

const [
  { createDb, user, creatorProfiles, embeddings, createCreatorProfile, upsertProfileEmbedding },
  ai,
  aiTesting,
  { eq, inArray },
] = await Promise.all([
  import("@resonance/db"),
  import("@resonance/ai"),
  import("@resonance/ai/testing"),
  import("drizzle-orm"),
]);

/**
 * The cast. Headlines and tags are deliberately varied and topically clustered (herbal/apothecary,
 * ceramics, sound, textiles) so that a query like "tinctures" or "stoneware" produces a visibly
 * RANKED list rather than an arbitrary one — the ranking is the thing being judged.
 */
const CAST = [
  {
    slug: "juniper-vale",
    displayName: "Juniper Vale",
    headline: "Wildcrafted elixirs from the coast range",
    bio: "Small-batch tinctures and bitters, foraged within a day's walk of the studio. Everything is made in ritual batches and labelled by hand.",
    tags: ["tinctures", "herbalism", "foraging", "bitters"],
    offerings: [
      {
        title: "Coast Range Bitters",
        description: "Douglas fir, yarrow and bitter orange in a slow cold infusion.",
      },
      {
        title: "Evening Tincture",
        description: "Passionflower and lemon balm for winding down after long days.",
      },
    ],
  },
  {
    slug: "marisol-okonkwo",
    displayName: "Marisol Okonkwo",
    headline: "Apothecary blends for slow evenings",
    bio: "A herbal apothecary built around rest. Blends are formulated in small runs and tested on nobody but me and a patient circle of friends.",
    tags: ["apothecary", "tinctures", "tea", "rest"],
    offerings: [
      {
        title: "Slow Evening Blend",
        description: "Chamomile, tulsi and rose for the last hour of the day.",
      },
    ],
  },
  {
    slug: "kofi-mensah",
    displayName: "Kofi Mensah",
    headline: "Barrel-aged botanical bitters",
    bio: "Bitters aged in reclaimed oak. I started making these for my own bar and never quite stopped.",
    tags: ["bitters", "botanical", "barrel-aged", "tinctures"],
    offerings: [
      {
        title: "Oak & Gentian Bitters",
        description: "Twelve weeks in char-two oak. Bracing, faintly sweet.",
      },
    ],
  },
  {
    slug: "ines-haraldsen",
    displayName: "Ines Haraldsen",
    headline: "Nettle, elderberry and everyday tonics",
    bio: "Tonics for ordinary days rather than emergencies. Everything is shelf-stable and meant to be used, not saved.",
    tags: ["tonics", "elderberry", "herbalism", "wellness"],
    offerings: [
      {
        title: "Elderberry Everyday",
        description: "A daily tonic that does not taste like a chore.",
      },
    ],
  },
  {
    slug: "wren-alderly",
    displayName: "Wren Alderly",
    headline: "Hand-thrown stoneware for everyday tables",
    bio: "Functional pots for people who actually cook. Thrown, trimmed and glazed in a one-person studio.",
    tags: ["ceramics", "stoneware", "pottery", "tableware"],
    offerings: [
      {
        title: "Everyday Bowl Set",
        description: "Four bowls in a soft ash glaze. Dishwasher-safe, genuinely.",
      },
      { title: "Morning Mug", description: "Holds exactly one large coffee. Comfortable handle." },
    ],
  },
  {
    slug: "theo-brandt",
    displayName: "Theo Brandt",
    headline: "Fermented shrubs, syrups and vinegars",
    bio: "Drinking vinegars and shrubs from fruit that would otherwise be composted. Seasonal, so the list changes constantly.",
    tags: ["fermentation", "shrubs", "syrups", "vinegar"],
    offerings: [
      {
        title: "Seasonal Shrub Trio",
        description: "Three drinking vinegars from whatever the orchard gave up.",
      },
    ],
  },
  {
    slug: "saoirse-nolan",
    displayName: "Saoirse Nolan",
    headline: "Foraged remedies, taught in small groups",
    bio: "I teach foraging and simple remedy-making to groups of six or fewer, mostly outdoors, mostly in the rain.",
    tags: ["foraging", "teaching", "herbalism", "workshops"],
    offerings: [
      {
        title: "Foraging Day",
        description: "A full day identifying and processing what we find. Six people maximum.",
      },
    ],
  },
  {
    slug: "dahlia-reyes",
    displayName: "Dahlia Reyes",
    headline: "Studio herbalist and blending workshops",
    bio: "Blending sessions where you leave with something you made and understand. Studio space is small and warm.",
    tags: ["herbalism", "workshops", "blending", "tea"],
    offerings: [
      {
        title: "Blend Your Own",
        description: "Two hours, your own formulation, sixty grams to take home.",
      },
    ],
  },
  {
    slug: "aurora-sound-temple",
    displayName: "Aurora Sound Temple",
    headline: "Bowls, gongs and long-form listening",
    bio: "Sound sessions for people who find sitting still difficult. Instruments are old, the room is dark.",
    tags: ["sound", "meditation", "listening", "wellness"],
    offerings: [
      {
        title: "Evening Sound Bath",
        description: "Ninety minutes. Bring a blanket; most people fall asleep.",
      },
    ],
  },
  {
    slug: "golden-fern-farm",
    displayName: "Golden Fern Farm",
    headline: "Dried herbs and cut flowers, no-spray",
    bio: "A two-acre no-spray farm. We dry most of what we grow and sell the rest at the Saturday market.",
    tags: ["farm", "dried herbs", "flowers", "no-spray"],
    offerings: [
      {
        title: "Dried Herb Box",
        description: "A rotating half-kilo of whatever dried best this month.",
      },
    ],
  },
];

const db = createDb();
const userIds = CAST.map((c) => `seed-dev-${c.slug}`);

if (CLEAN) {
  // Embeddings are polymorphic (no FK), so clear them by profile id BEFORE deleting the users that
  // cascade the profiles away — otherwise the vectors are orphaned with nothing pointing at them.
  const profiles = await db
    .select({ id: creatorProfiles.id })
    .from(creatorProfiles)
    .where(inArray(creatorProfiles.userId, userIds));
  if (profiles.length > 0) {
    await db.delete(embeddings).where(
      inArray(
        embeddings.sourceId,
        profiles.map((p) => p.id),
      ),
    );
  }
  await db.delete(user).where(inArray(user.id, userIds));
  tsxHandle?.unregister?.();
  console.log(
    `db:seed --clean removed ${profiles.length} seeded profile(s) and ${userIds.length} user(s).`,
  );
  process.exit(0);
}

const embedder = HARNESS ? aiTesting.createFakeEmbedder() : ai.resolveEmbedder();
console.log(
  `db:seed embedding with ${HARNESS ? "the DETERMINISTIC FAKE (E2E_HARNESS=1)" : "LIVE " + embedder.model}` +
    `\n  → serve the app the same way, or seeded vectors and query vectors will not share a space.\n`,
);

let n = 0;
for (const c of CAST) {
  const userId = `seed-dev-${c.slug}`;
  const email = `${c.slug}@seed.dev.local`;

  // Better Auth owns this table; insert the minimum a profile's FK needs. `roles` is the
  // comma-encoded Role[] the app reads, and these are creators by construction.
  await db
    .insert(user)
    .values({
      id: userId,
      name: c.displayName,
      email,
      emailVerified: true,
      roles: "member,creator",
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({ target: user.id, set: { name: c.displayName, roles: "member,creator" } });

  const profile = await createCreatorProfile(db, {
    userId,
    displayName: c.displayName,
    headline: c.headline,
    bio: c.bio,
    tags: c.tags,
    offerings: c.offerings,
    status: "ready", // discovery filters on this; a draft would be invisible by design
  });

  const { model, content, embedding } = await embedder.embedProfile({
    displayName: c.displayName,
    headline: c.headline,
    bio: c.bio,
    tags: c.tags,
    offerings: c.offerings,
  });
  await upsertProfileEmbedding(db, { profileId: profile.id, model, content, embedding });

  n += 1;
  console.log(`  ✓ ${c.displayName.padEnd(24)} ${profile.id}`);
}

tsxHandle?.unregister?.();
console.log(
  `\ndb:seed OK — ${n} creators seeded and embedded.\n` +
    `  Browse: http://localhost:3000/discover?q=tinctures  (also try: stoneware, foraging, sound)\n` +
    `  Remove: pnpm db:seed --clean`,
);
process.exit(0);
