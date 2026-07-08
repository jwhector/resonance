import { type CommitProfileInput } from "@resonance/core";
import { findSimilarProfiles, user } from "@resonance/db";
import { createTestDb, type TestDb } from "@resonance/db/testing";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createFakeEmbedder } from "../../embeddings";
import { commitCreatorProfile } from "./commit-profile";

/**
 * Slice-level matching acceptance for the Creator Onboarding vertical (ADR-0010). The
 * sibling `commit-profile.test.ts` proves embed→match self-retrieval (a committed profile is
 * findable by its own embedding); this proves the backbone also DISCRIMINATES — with two
 * distinct creators committed, a query built from one creator's profile text ranks THAT
 * creator first, above the unrelated one.
 *
 * It runs the exact production commit path (`commitCreatorProfile`: embed → write profile →
 * write embedding row) against PGlite + pgvector with the deterministic fake embedder, so the
 * matching guarantee is verified end-to-end and credential-free (mirrors the real Neon/Voyage
 * wiring the E2E flow exercises against the live DB).
 */

const potter: CommitProfileInput = {
  displayName: "Clay & Kiln",
  headline: "Hand-thrown stoneware for everyday tables",
  bio: "I throw functional pottery — mugs, bowls, and plates — glazed in earthy tones for daily use.",
  tags: ["pottery", "ceramics", "stoneware"],
};

const coder: CommitProfileInput = {
  displayName: "Pixel Forge",
  headline: "Indie developer building cozy pixel-art games",
  bio: "I make small narrative games with hand-drawn pixel art and original chiptune soundtracks.",
  tags: ["gamedev", "pixel-art", "indie"],
};

describe("creator-profile matching backbone (PGlite + pgvector + fake embedder)", () => {
  let db: TestDb;
  let close: () => Promise<void>;

  beforeEach(async () => {
    ({ db, close } = await createTestDb());
    await db.insert(user).values([
      { id: "u-potter", name: "Potter", email: "potter@x.com" },
      { id: "u-coder", name: "Coder", email: "coder@x.com" },
    ]);
  });
  afterEach(async () => {
    await close();
  });

  it("ranks the matching creator first when queried with their own profile text", async () => {
    const embedder = createFakeEmbedder();
    const { profileId: potterId } = await commitCreatorProfile(
      { userId: "u-potter", currentRoles: ["member"], db, embedder },
      potter,
    );
    const { profileId: coderId } = await commitCreatorProfile(
      { userId: "u-coder", currentRoles: ["member"], db, embedder },
      coder,
    );
    expect(potterId).not.toBe(coderId);

    // Query with an embedding of the potter's committed content (offerings [] as at commit).
    const { embedding: potterQuery } = await createFakeEmbedder().embedProfile({
      ...potter,
      offerings: [],
    });
    const potterResults = await findSimilarProfiles(db, potterQuery);
    expect(potterResults[0]?.id).toBe(potterId);
    const coderInPotter = potterResults.find((r) => r.id === coderId);
    // The unrelated creator is present but strictly less similar — the backbone discriminates.
    expect(potterResults[0]!.similarity).toBeGreaterThan(coderInPotter!.similarity);

    // Symmetric check: the coder's own text ranks the coder first.
    const { embedding: coderQuery } = await createFakeEmbedder().embedProfile({
      ...coder,
      offerings: [],
    });
    const coderResults = await findSimilarProfiles(db, coderQuery);
    expect(coderResults[0]?.id).toBe(coderId);
  });
});
