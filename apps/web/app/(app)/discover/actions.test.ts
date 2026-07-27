import { ResonanceError, type CreatorResultPage } from "@resonance/core";
import { afterEach, describe, expect, it, vi } from "vitest";

// The actions touch server-only seams — mock each package's public entrypoint so the boundary
// (Zod validation + viewer resolution + wiring) is testable without a live DB or embedder.
// Session reads go through the shell's `getWebSession`, so `lib/auth` is what we mock, not
// `@resonance/auth` (seed resonance-eb15).
const getWebSession = vi.fn();
const searchCreatorsPort = vi.fn();
const createDiscoveryAdapter = vi.fn((_deps: { db: unknown; embed: (t: string) => unknown }) => ({
  searchCreators: searchCreatorsPort,
}));
const followCreatorEdge = vi.fn();
const unfollowCreatorEdge = vi.fn();
const createDb = vi.fn(() => ({ __db: true }));
const embed = vi.fn(async () => new Array(1024).fill(0));

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("../../../lib/auth", () => ({ getWebSession: (h: Headers) => getWebSession(h) }));
vi.mock("../../../lib/e2e-harness", () => ({
  discoveryEmbedder: async () => ({ model: "fake", embed }),
}));
vi.mock("@resonance/db", () => ({
  createDb: () => createDb(),
  createDiscoveryAdapter: (deps: { db: unknown; embed: (t: string) => unknown }) =>
    createDiscoveryAdapter(deps),
  followCreator: (db: unknown, edge: unknown) => followCreatorEdge(db, edge),
  unfollowCreator: (db: unknown, edge: unknown) => unfollowCreatorEdge(db, edge),
}));

import { followCreator, searchCreators, unfollowCreator } from "./actions";

const emptyPage: CreatorResultPage = { kind: "creators", results: [], nextCursor: null };
const sessionUser = { id: "user_1", email: "a@b.com", roles: ["member"] as const };

afterEach(() => {
  vi.clearAllMocks();
});

describe("searchCreators", () => {
  it("rejects a whitespace-only query at the Zod boundary, before any session or embed call", async () => {
    await expect(searchCreators({ text: "   " })).rejects.toThrow();
    expect(getWebSession).not.toHaveBeenCalled();
    expect(embed).not.toHaveBeenCalled();
    expect(searchCreatorsPort).not.toHaveBeenCalled();
  });

  it("rejects a query over the length cap", async () => {
    await expect(searchCreators({ text: "x".repeat(201) })).rejects.toThrow();
    expect(searchCreatorsPort).not.toHaveBeenCalled();
  });

  it("searches with viewer null when signed out (every row then reads as unknown)", async () => {
    getWebSession.mockResolvedValueOnce(null);
    searchCreatorsPort.mockResolvedValueOnce(emptyPage);

    await expect(searchCreators({ text: "tinctures" })).resolves.toEqual(emptyPage);

    const [query, viewer] = searchCreatorsPort.mock.calls[0]!;
    expect(viewer).toBeNull();
    expect(query).toMatchObject({ text: "tinctures", kind: "creators", tags: [], limit: 20 });
  });

  it("derives the viewer from the session, never from the payload", async () => {
    getWebSession.mockResolvedValueOnce(sessionUser);
    searchCreatorsPort.mockResolvedValueOnce(emptyPage);

    // A caller trying to search AS someone else: the identity fields are not on the query
    // schema, so they are stripped and the session wins. This is the whole reason `viewer` is
    // a separate parameter rather than a field on `CreatorDiscoveryQuery`.
    await searchCreators({
      text: "tinctures",
      viewer: { userId: "attacker" },
      userId: "attacker",
    });

    const [query, viewer] = searchCreatorsPort.mock.calls[0]!;
    expect(viewer).toEqual({ userId: "user_1" });
    expect(query).not.toHaveProperty("viewer");
    expect(query).not.toHaveProperty("userId");
  });

  it("injects the app-layer embedder into the db adapter (ai → db, never imported)", async () => {
    getWebSession.mockResolvedValueOnce(null);
    searchCreatorsPort.mockResolvedValueOnce(emptyPage);

    await searchCreators({ text: "tinctures" });

    const [deps] = createDiscoveryAdapter.mock.calls[0]!;
    expect(deps.db).toEqual({ __db: true });
    await deps.embed("tinctures");
    expect(embed).toHaveBeenCalledWith("tinctures");
  });

  it("passes the tuning knobs through untouched, so ranking stays swappable without a UI change", async () => {
    getWebSession.mockResolvedValueOnce(null);
    searchCreatorsPort.mockResolvedValueOnce(emptyPage);

    await searchCreators({ text: "tea", tags: ["herbal"], threshold: 0.4, limit: 5, cursor: "c1" });

    expect(searchCreatorsPort.mock.calls[0]![0]).toMatchObject({
      tags: ["herbal"],
      threshold: 0.4,
      limit: 5,
      cursor: "c1",
    });
  });

  it("lets a port failure propagate rather than reporting an empty page", async () => {
    getWebSession.mockResolvedValueOnce(sessionUser);
    searchCreatorsPort.mockRejectedValueOnce(new ResonanceError("embedding_dims", "wrong width"));
    await expect(searchCreators({ text: "tea" })).rejects.toThrow(/wrong width/);
  });
});

describe("followCreator / unfollowCreator", () => {
  it("rejects a malformed payload at the Zod boundary", async () => {
    await expect(followCreator({ creatorUserId: "" })).rejects.toThrow();
    expect(getWebSession).not.toHaveBeenCalled();
    expect(followCreatorEdge).not.toHaveBeenCalled();
  });

  it("refuses a signed-out follow with a typed reason instead of writing or throwing", async () => {
    getWebSession.mockResolvedValueOnce(null);
    await expect(followCreator({ creatorUserId: "creator_9" })).resolves.toEqual({
      ok: false,
      reason: "unauthenticated",
    });
    expect(followCreatorEdge).not.toHaveBeenCalled();
  });

  it("refuses a signed-out unfollow the same way", async () => {
    getWebSession.mockResolvedValueOnce(null);
    await expect(unfollowCreator({ creatorUserId: "creator_9" })).resolves.toEqual({
      ok: false,
      reason: "unauthenticated",
    });
    expect(unfollowCreatorEdge).not.toHaveBeenCalled();
  });

  it("writes the edge from the session's user id and reports the resulting state", async () => {
    getWebSession.mockResolvedValueOnce(sessionUser);
    await expect(followCreator({ creatorUserId: "creator_9" })).resolves.toEqual({
      ok: true,
      followState: "following",
    });
    expect(followCreatorEdge).toHaveBeenCalledWith(
      { __db: true },
      { followerId: "user_1", followingId: "creator_9" },
    );
  });

  it("removes the edge on unfollow", async () => {
    getWebSession.mockResolvedValueOnce(sessionUser);
    await expect(unfollowCreator({ creatorUserId: "creator_9" })).resolves.toEqual({
      ok: true,
      followState: "not_following",
    });
    expect(unfollowCreatorEdge).toHaveBeenCalledWith(
      { __db: true },
      { followerId: "user_1", followingId: "creator_9" },
    );
  });

  it("surfaces db's typed follow_self error as a named reason, not a driver error", async () => {
    getWebSession.mockResolvedValueOnce(sessionUser);
    followCreatorEdge.mockRejectedValueOnce(
      new ResonanceError("follow_self", "A user cannot follow themselves."),
    );
    await expect(followCreator({ creatorUserId: "user_1" })).resolves.toEqual({
      ok: false,
      reason: "follow_self",
    });
  });

  it("lets any other failure propagate", async () => {
    getWebSession.mockResolvedValueOnce(sessionUser);
    followCreatorEdge.mockRejectedValueOnce(new Error("connection terminated"));
    await expect(followCreator({ creatorUserId: "creator_9" })).rejects.toThrow(
      /connection terminated/,
    );
  });
});
