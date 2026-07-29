import { describe, expect, it } from "vitest";
import {
  CreatorDiscoveryQuerySchema,
  CreatorResultPageSchema,
  CreatorResultSchema,
  DISCOVERY_DEFAULT_LIMIT,
  DISCOVERY_MAX_LIMIT,
  DiscoveryQuerySchema,
  FollowStateSchema,
  RESULT_KINDS,
  ResultKindSchema,
  type CreatorResult,
  type DiscoveryPort,
  type DiscoveryViewer,
} from "./discovery";

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// ---------------------------------------------------------------------------
// A second adapter at the seam.
//
// This is the acceptance proof that ranking is swappable: a complete DiscoveryPort
// implementation with no database, no embeddings, and no SQL — just an in-memory corpus
// ranked by naive term overlap. It exists to be driven *through the interface*, exactly as
// `@resonance/db`'s ANN adapter will be, and it deliberately implements the documented
// invariants (ordering, threshold, limit, cursor, viewer→followState) rather than only the
// type signature. If a future ranker cannot be substituted here, the seam is in the wrong
// place.
// ---------------------------------------------------------------------------

type CorpusEntry = {
  profileId: string;
  userId: string;
  displayName: string;
  headline: string;
  tags: string[];
  /** Terms the naive ranker scores against. */
  terms: string[];
  status: "draft" | "ready";
};

function createFakeDiscoveryPort(
  corpus: CorpusEntry[],
  follows: ReadonlyMap<string, ReadonlySet<string>> = new Map(),
  /** Stored interest terms per user — this fake's stand-in for an interest embedding. */
  interests: ReadonlyMap<string, readonly string[]> = new Map(),
): DiscoveryPort {
  return {
    searchCreators(query, viewer) {
      // invariant 8: absent text ⇒ rank on the viewer's stored interests instead. No
      // viewer, or no interests, ⇒ an empty page — never an unranked dump of the corpus.
      const stored = viewer ? interests.get(viewer.userId) : undefined;
      const signal = query.text ?? (stored ?? []).join(" ");
      if (query.text === undefined && signal === "") {
        return Promise.resolve({ kind: "creators" as const, results: [], nextCursor: null });
      }

      const wanted = signal.toLowerCase().split(/\s+/).filter(Boolean);
      const followed = viewer ? (follows.get(viewer.userId) ?? new Set<string>()) : null;

      const ranked = corpus
        // invariant 6: draft-status profiles never surface
        .filter((entry) => entry.status === "ready")
        // tag filter: every requested tag must be present
        .filter((entry) => query.tags.every((tag) => entry.tags.includes(tag)))
        .map((entry): CreatorResult => {
          const hits = entry.terms.filter((term) => wanted.includes(term)).length;
          return {
            profileId: entry.profileId,
            userId: entry.userId,
            displayName: entry.displayName,
            headline: entry.headline,
            tags: entry.tags,
            similarity: entry.terms.length === 0 ? 0 : hits / entry.terms.length,
            // invariant 5: no viewer ⇒ "unknown"; viewer ⇒ never "unknown"
            followState:
              followed === null
                ? "unknown"
                : followed.has(entry.userId)
                  ? "following"
                  : "not_following",
          };
        })
        // invariant 3: threshold is a minimum similarity
        .filter((r) => (query.threshold === undefined ? true : r.similarity >= query.threshold))
        // invariant 2: descending similarity (profileId breaks ties so paging is stable)
        .sort((a, b) => b.similarity - a.similarity || a.profileId.localeCompare(b.profileId));

      // Opaque cursor: an offset, but callers may not know or care that it is one.
      const offset = query.cursor === undefined ? 0 : Number(atob(query.cursor));
      const window = ranked.slice(offset, offset + query.limit);
      const nextOffset = offset + window.length;

      return Promise.resolve({
        kind: "creators" as const,
        results: window,
        // invariant 4: non-null iff more may follow
        nextCursor: nextOffset < ranked.length ? btoa(String(nextOffset)) : null,
      });
    },
  };
}

const CORPUS: CorpusEntry[] = [
  {
    profileId: uuid(1),
    userId: "user_potter",
    displayName: "Clay & Coast",
    headline: "Wheel-thrown stoneware from the Oregon coast",
    tags: ["ceramics", "handmade"],
    terms: ["pottery", "ceramics", "clay"],
    status: "ready",
  },
  {
    profileId: uuid(2),
    userId: "user_glazer",
    displayName: "Kiln Notes",
    headline: "Glaze chemistry, explained",
    tags: ["ceramics"],
    terms: ["pottery", "glaze"],
    status: "ready",
  },
  {
    profileId: uuid(3),
    userId: "user_dev",
    displayName: "Terminal Velocity",
    headline: "Rust systems programming screencasts",
    tags: ["software"],
    terms: ["rust", "systems", "code"],
    status: "ready",
  },
  {
    profileId: uuid(4),
    userId: "user_draft",
    displayName: "Unfinished Pottery Co",
    headline: "Not published yet",
    tags: ["ceramics"],
    terms: ["pottery", "ceramics", "clay"],
    status: "draft",
  },
];

const parse = (input: unknown) => CreatorDiscoveryQuerySchema.parse(input);

describe("DiscoveryQuerySchema", () => {
  it("validates a bare query and applies the designed defaults", () => {
    expect(DiscoveryQuerySchema.parse({ text: "pottery" })).toEqual({
      text: "pottery",
      kind: "creators",
      tags: [],
      limit: DISCOVERY_DEFAULT_LIMIT,
    });
  });

  it("trims text so a whitespace-only search fails at the boundary, not at the embedder", () => {
    expect(DiscoveryQuerySchema.parse({ text: "  pottery  " }).text).toBe("pottery");
    expect(() => DiscoveryQuerySchema.parse({ text: "   " })).toThrow();
    expect(() => DiscoveryQuerySchema.parse({ text: "" })).toThrow();
  });

  it("treats absent text as a personalized query, but still rejects a blank one", () => {
    // Absent means "no query — rank for this viewer" (invariant 8) and is valid.
    expect(DiscoveryQuerySchema.parse({}).text).toBeUndefined();
    expect(DiscoveryQuerySchema.parse({ text: undefined }).text).toBeUndefined();
    // A blank search box is malformed input, NOT a request to personalize. If these two
    // ever collapse into one case, an empty search silently becomes a browse.
    expect(() => DiscoveryQuerySchema.parse({ text: "" })).toThrow();
    expect(() => DiscoveryQuerySchema.parse({ text: "\t \n" })).toThrow();
    // Everything else still applies to a personalized query.
    expect(DiscoveryQuerySchema.parse({}).limit).toBe(DISCOVERY_DEFAULT_LIMIT);
    expect(() => DiscoveryQuerySchema.parse({ limit: DISCOVERY_MAX_LIMIT + 1 })).toThrow();
  });

  it("caps the page size and rejects a fractional or oversized limit", () => {
    expect(DiscoveryQuerySchema.parse({ text: "a", limit: DISCOVERY_MAX_LIMIT }).limit).toBe(
      DISCOVERY_MAX_LIMIT,
    );
    expect(() =>
      DiscoveryQuerySchema.parse({ text: "a", limit: DISCOVERY_MAX_LIMIT + 1 }),
    ).toThrow();
    expect(() => DiscoveryQuerySchema.parse({ text: "a", limit: 0 })).toThrow();
    expect(() => DiscoveryQuerySchema.parse({ text: "a", limit: 1.5 })).toThrow();
  });

  it("keeps threshold inside [0,1]", () => {
    expect(DiscoveryQuerySchema.parse({ text: "a", threshold: 0.42 }).threshold).toBe(0.42);
    expect(() => DiscoveryQuerySchema.parse({ text: "a", threshold: 1.5 })).toThrow();
    expect(() => DiscoveryQuerySchema.parse({ text: "a", threshold: -0.1 })).toThrow();
  });

  it("accepts every designed tab kind and rejects anything else", () => {
    for (const kind of RESULT_KINDS) {
      expect(DiscoveryQuerySchema.parse({ text: "a", kind }).kind).toBe(kind);
    }
    expect(ResultKindSchema.options).toEqual(["creators", "products", "services", "posts"]);
    expect(() => DiscoveryQuerySchema.parse({ text: "a", kind: "events" })).toThrow();
  });

  it("narrows to creators without drifting from the parent schema", () => {
    expect(CreatorDiscoveryQuerySchema.parse({ text: "a" }).kind).toBe("creators");
    // The narrowing is the compiler-enforced dispatch: other tabs cannot reach the port.
    expect(() => CreatorDiscoveryQuerySchema.parse({ text: "a", kind: "posts" })).toThrow();
    // Parent fields are inherited, not restated.
    expect(Object.keys(CreatorDiscoveryQuerySchema.shape).sort()).toEqual(
      Object.keys(DiscoveryQuerySchema.shape).sort(),
    );
  });
});

describe("CreatorResultSchema", () => {
  const valid: CreatorResult = {
    profileId: uuid(1),
    userId: "user_potter",
    displayName: "Clay & Coast",
    headline: "Wheel-thrown stoneware",
    tags: ["ceramics"],
    similarity: 0.87,
    followState: "not_following",
  };

  it("accepts a designed row", () => {
    expect(CreatorResultSchema.parse(valid)).toEqual(valid);
  });

  it("admits the full cosine-similarity range but nothing outside it", () => {
    expect(CreatorResultSchema.parse({ ...valid, similarity: -1 }).similarity).toBe(-1);
    expect(() => CreatorResultSchema.parse({ ...valid, similarity: 1.01 })).toThrow();
  });

  it("has no avatar field — the slice ships an initials placeholder, not a fabricated column", () => {
    expect(Object.keys(CreatorResultSchema.shape).sort()).toEqual([
      "displayName",
      "followState",
      "headline",
      "profileId",
      "similarity",
      "tags",
      "userId",
    ]);
  });

  it("models follow state as three states so signed-out is not mislabelled", () => {
    expect(FollowStateSchema.options).toEqual(["following", "not_following", "unknown"]);
  });
});

describe("DiscoveryPort (driven purely through the interface)", () => {
  const port = createFakeDiscoveryPort(
    CORPUS,
    new Map([["user_member", new Set(["user_potter"])]]),
  );
  const anonymous: DiscoveryViewer = null;
  const member: DiscoveryViewer = { userId: "user_member" };

  it("returns a page that satisfies the published result contract", async () => {
    const page = await port.searchCreators(parse({ text: "pottery" }), anonymous);
    expect(() => CreatorResultPageSchema.parse(page)).not.toThrow();
    expect(page.kind).toBe("creators");
  });

  it("orders results by descending similarity", async () => {
    const page = await port.searchCreators(parse({ text: "pottery ceramics clay" }), anonymous);
    const scores = page.results.map((r) => r.similarity);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(page.results[0]?.displayName).toBe("Clay & Coast");
  });

  it("never surfaces a draft-status profile", async () => {
    const page = await port.searchCreators(parse({ text: "pottery ceramics clay" }), anonymous);
    expect(page.results.map((r) => r.userId)).not.toContain("user_draft");
  });

  it("honours the tag filter", async () => {
    const page = await port.searchCreators(
      parse({ text: "pottery rust", tags: ["software"] }),
      anonymous,
    );
    expect(page.results.map((r) => r.userId)).toEqual(["user_dev"]);
  });

  it("drops results below the threshold — retuning ranking needs no caller change", async () => {
    const query = { text: "pottery ceramics clay" };
    const loose = await port.searchCreators(parse(query), anonymous);
    const strict = await port.searchCreators(parse({ ...query, threshold: 0.9 }), anonymous);

    expect(loose.results.length).toBeGreaterThan(strict.results.length);
    for (const r of strict.results) expect(r.similarity).toBeGreaterThanOrEqual(0.9);
  });

  it("pages with an opaque cursor the caller only ever round-trips", async () => {
    const query = { text: "pottery ceramics clay rust systems code", limit: 1 };
    const first = await port.searchCreators(parse(query), anonymous);
    expect(first.results).toHaveLength(1);
    expect(first.nextCursor).not.toBeNull();

    const seen = [...first.results];
    let cursor = first.nextCursor;
    while (cursor !== null) {
      const next = await port.searchCreators(parse({ ...query, cursor }), anonymous);
      seen.push(...next.results);
      cursor = next.nextCursor;
    }

    // Every ready profile, exactly once, and the last page says so with an explicit null.
    expect(seen).toHaveLength(3);
    expect(new Set(seen.map((r) => r.profileId)).size).toBe(3);
  });

  it("reports follow state as unknown for a signed-out viewer", async () => {
    const page = await port.searchCreators(parse({ text: "pottery" }), anonymous);
    expect(page.results.length).toBeGreaterThan(0);
    for (const r of page.results) expect(r.followState).toBe("unknown");
  });

  it("resolves real follow state for a signed-in viewer", async () => {
    const page = await port.searchCreators(parse({ text: "pottery ceramics clay" }), member);
    const byUser = new Map(page.results.map((r) => [r.userId, r.followState]));
    expect(byUser.get("user_potter")).toBe("following");
    expect(byUser.get("user_glazer")).toBe("not_following");
    for (const r of page.results) expect(r.followState).not.toBe("unknown");
  });

  it("is swappable: a different ranker changes the order with no change at the call site", async () => {
    // Same interface, opposite ranking. The "call site" below is byte-identical for both.
    const reversed: DiscoveryPort = {
      async searchCreators(query, viewer) {
        const page = await port.searchCreators(query, viewer);
        return { ...page, results: [...page.results].reverse() };
      },
    };

    const callSite = (p: DiscoveryPort) =>
      p
        .searchCreators(parse({ text: "pottery ceramics clay" }), anonymous)
        .then((page) => page.results.map((r) => r.userId));

    const baseline = await callSite(port);
    const experiment = await callSite(reversed);

    expect(experiment).toEqual([...baseline].reverse());
    expect(baseline).not.toEqual(experiment);
  });

  it("returns an empty page — not an error — when nothing matches", async () => {
    const page = await port.searchCreators(
      parse({ text: "underwater basket weaving", threshold: 0.5 }),
      anonymous,
    );
    expect(page.results).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Invariant 8 — personalized ranking behind the SAME seam (Slice B, resonance-b149).
//
// The point of these cases is that nothing about the interface changed: the same one
// method, driven with `text` absent, ranks on the viewer's stored interests. If this had
// needed a second method or a sibling port, the seam would have been in the wrong place.
// ---------------------------------------------------------------------------
describe("DiscoveryPort — personalized ranking when there is no query text", () => {
  const port = createFakeDiscoveryPort(
    CORPUS,
    new Map(),
    new Map([
      ["user_ceramicist", ["pottery", "ceramics", "clay"]],
      ["user_engineer", ["rust", "systems", "code"]],
    ]),
  );
  const ceramicist: DiscoveryViewer = { userId: "user_ceramicist" };
  const engineer: DiscoveryViewer = { userId: "user_engineer" };
  const uninterested: DiscoveryViewer = { userId: "user_blank" };
  const anonymousViewer: DiscoveryViewer = null;

  it("ranks on the viewer's interests when text is absent", async () => {
    const page = await port.searchCreators(parse({}), ceramicist);

    expect(() => CreatorResultPageSchema.parse(page)).not.toThrow();
    // Ranked, not filtered: an unrelated creator still appears, but below the matches —
    // exactly as it would for the equivalent text search. Thresholding is the caller's
    // lever (invariant 3), not something the personalized path applies on its own.
    const order = page.results.map((r) => r.userId);
    expect(order[0]).toBe("user_potter");
    expect(order.indexOf("user_dev")).toBeGreaterThan(order.indexOf("user_glazer"));
    expect(page.results.find((r) => r.userId === "user_dev")?.similarity).toBe(0);
  });

  it("gives two members with different interests different rankings", async () => {
    const forPotter = await port.searchCreators(parse({}), ceramicist);
    const forDev = await port.searchCreators(parse({}), engineer);

    expect(forPotter.results[0]?.userId).toBe("user_potter");
    expect(forDev.results[0]?.userId).toBe("user_dev");
  });

  it("returns an empty page for a signed-out viewer rather than an unranked dump", async () => {
    const page = await port.searchCreators(parse({}), anonymousViewer);

    expect(page.results).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it("returns an empty page for a viewer who skipped the picker", async () => {
    // The skippable picker makes this a real production path, not an edge case.
    const page = await port.searchCreators(parse({}), uninterested);

    expect(page.results).toEqual([]);
    expect(page.nextCursor).toBeNull();
  });

  it("still honours every other invariant on the personalized path", async () => {
    const page = await port.searchCreators(parse({ limit: 1 }), ceramicist);
    // invariant 4: at most `limit`, cursor non-null iff more may follow
    expect(page.results).toHaveLength(1);
    expect(page.nextCursor).not.toBeNull();
    // invariant 6: drafts never surface, even when they match the interests perfectly
    const all = await port.searchCreators(parse({}), ceramicist);
    expect(all.results.map((r) => r.userId)).not.toContain("user_draft");
    // invariant 5: a signed-in viewer's follow state is always knowable
    expect(all.results.every((r) => r.followState !== "unknown")).toBe(true);
    // invariant 2: descending similarity
    const sims = all.results.map((r) => r.similarity);
    expect([...sims].sort((a, b) => b - a)).toEqual(sims);
  });

  it("keeps the tag filter working without a query string", async () => {
    const page = await port.searchCreators(parse({ tags: ["handmade"] }), ceramicist);

    expect(page.results.map((r) => r.userId)).toEqual(["user_potter"]);
  });
});
