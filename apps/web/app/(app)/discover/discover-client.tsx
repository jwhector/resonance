"use client";

import * as React from "react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CreatorResult, FollowState, ResultKind } from "@resonance/core";
import {
  ComingSoonState,
  CreatorResultList,
  NoResultsState,
  ResultTabs,
  SearchBar,
  type ComingSoonKind,
} from "@resonance/ui";
import { followCreator, unfollowCreator } from "./actions";

/**
 * The interactive half of `/discover` — the search field, the four-way tab bar, and the ranked
 * result list with its Follow controls.
 *
 * Wiring only (ADR-0002). Every pixel comes from `@resonance/ui`, every result from the
 * `DiscoveryPort` page the RSC already fetched; what lives here is the three decisions a server
 * component cannot make: which URL a search or tab click navigates to, which of the two Server
 * Actions a Follow click calls, and what a signed-out member sees when they click it.
 *
 * **Search and tab state live in the URL, not in this component.** Submitting the field or
 * picking a tab is a navigation, so the RSC re-runs the ranked query and a result page is
 * shareable, reloadable, and back-button-correct. Only the things that are genuinely transient —
 * the half-typed query, in-flight follow rows, and the sign-in prompt — are local state.
 */

/** Which "nothing to show" surface applies. Deliberately three cases, never collapsed into one. */
type ResultsView =
  /** The tab has no data source yet — a product statement (`ComingSoonState`). */
  | { view: "coming-soon"; kind: ComingSoonKind }
  /** Nothing has been searched yet. Not an outcome; the field is simply empty. */
  | { view: "idle" }
  /** A real query returned nothing (`NoResultsState`). */
  | { view: "no-results" }
  | { view: "results" };

/** What the follow control has to say back to the member. `null` while nothing needs saying. */
type FollowNotice = "sign-in" | "self";

export interface DiscoverClientProps {
  /** The query the results were produced from — URL state, echoed into the field. */
  query: string;
  /** The selected tab — URL state. */
  kind: ResultKind;
  /** The ranked page from `searchCreators`, already ordered; empty for a dataless tab. */
  results: readonly CreatorResult[];
  /**
   * Whether a session was resolved server-side. Not derivable from the rows: an empty result
   * page carries no `followState` to read it off, and the prompt has to work there too.
   */
  signedIn: boolean;
}

function discoverHref(kind: ResultKind, query: string): Route {
  const params = new URLSearchParams();
  if (query.trim().length > 0) params.set("q", query.trim());
  if (kind !== "creators") params.set("tab", kind);
  const search = params.toString();
  return (search.length > 0 ? `/discover?${search}` : "/discover") as Route;
}

export function DiscoverClient({ query, kind, results, signedIn }: DiscoverClientProps) {
  const router = useRouter();
  const [text, setText] = React.useState(query);
  // `query` is URL state that can change under a soft navigation (back/forward, or a shared
  // `/discover?q=…` opened while mounted) without remounting us. Resync the draft when the prop
  // itself changes — not on every render — so a query typed midway on the same URL survives.
  const [syncedQuery, setSyncedQuery] = React.useState(query);
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    setText(query);
  }
  /** Follow states this session has changed, layered over the server's. Keyed by creator user id. */
  const [followOverrides, setFollowOverrides] = React.useState<Record<string, FollowState>>({});
  const [pendingUserIds, setPendingUserIds] = React.useState<readonly string[]>([]);
  const [notice, setNotice] = React.useState<FollowNotice | null>(null);

  const rows = React.useMemo(
    () =>
      results.map((result) => {
        const override = followOverrides[result.userId];
        return override ? { ...result, followState: override } : result;
      }),
    [results, followOverrides],
  );

  // Rows decide first, because an empty query can legitimately have results: with no
  // query text the port ranks on the member's stored interests instead (`DiscoveryPort` invariant
  // 8). Keying `idle` off the query alone would swallow exactly those personalized rows.
  //
  // The three "nothing to show" cases stay distinct. `idle` now means "nothing searched AND nothing
  // to suggest" — a signed-out visitor, or a member who skipped the picker — while `no-results`
  // still means a real query that matched nothing.
  const resultsView: ResultsView =
    kind !== "creators"
      ? { view: "coming-soon", kind }
      : rows.length > 0
        ? { view: "results" }
        : query.length === 0
          ? { view: "idle" }
          : { view: "no-results" };

  function navigate(nextKind: ResultKind, nextQuery: string) {
    router.push(discoverHref(nextKind, nextQuery));
  }

  async function toggleFollow(result: CreatorResult) {
    // Signed out: prompt, never silently fail. The row is drawn with `followState: "unknown"`
    // precisely so the control is live for anonymous members, and the honest answer to the click
    // is "sign in" — so we say it here rather than firing an action that can only be refused.
    if (!signedIn) {
      setNotice("sign-in");
      return;
    }

    const current = followOverrides[result.userId] ?? result.followState;
    setNotice(null);
    setPendingUserIds((ids) => [...ids, result.userId]);
    try {
      const outcome =
        current === "following"
          ? await unfollowCreator({ creatorUserId: result.userId })
          : await followCreator({ creatorUserId: result.userId });

      if (outcome.ok) {
        setFollowOverrides((states) => ({ ...states, [result.userId]: outcome.followState }));
      } else {
        // Defence in depth: the session can expire between render and click, so the action's own
        // refusal drives the same prompt the pre-check does.
        setNotice(outcome.reason === "unauthenticated" ? "sign-in" : "self");
      }
    } finally {
      setPendingUserIds((ids) => ids.filter((id) => id !== result.userId));
    }
  }

  return (
    <>
      <SearchBar
        value={text}
        onValueChange={setText}
        onSearch={(next) => navigate(kind, next)}
        onClear={() => navigate(kind, "")}
      />

      <ResultTabs value={kind} onValueChange={(next) => navigate(next, text)} />

      {notice === "sign-in" ? (
        <div
          role="alert"
          data-follow-notice="sign-in"
          className="flex w-full items-center justify-between gap-4 rounded-md border border-border bg-surface-muted px-4 py-3"
        >
          <p className="text-body-md text-foreground">Sign in to follow creators.</p>
          <Link
            href="/signup"
            className="rounded-sm text-body-md font-medium text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Sign in
          </Link>
        </div>
      ) : null}

      {notice === "self" ? (
        <p role="alert" data-follow-notice="self" className="text-body-md text-danger">
          That&apos;s your own profile — you can&apos;t follow yourself.
        </p>
      ) : null}

      {resultsView.view === "coming-soon" ? <ComingSoonState kind={resultsView.kind} /> : null}

      {resultsView.view === "idle" ? (
        <p data-empty-state="idle" className="text-body-lg text-muted">
          Search for what someone makes, teaches, or offers — Weave ranks creators by how closely
          their work matches.
        </p>
      ) : null}

      {resultsView.view === "no-results" ? <NoResultsState query={query} /> : null}

      {resultsView.view === "results" ? (
        <CreatorResultList
          results={rows}
          hrefFor={(result) => `/creator/${result.profileId}`}
          pendingUserIds={pendingUserIds}
          onFollowToggle={(result) => {
            void toggleFollow(result);
          }}
        />
      ) : null}
    </>
  );
}
