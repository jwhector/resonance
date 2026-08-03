import { headers } from "next/headers";
import { CreatorDiscoveryQuerySchema, ResultKindSchema, type CreatorResult } from "@resonance/core";
import { getWebSession } from "../../../lib/auth";
import { searchCreators } from "./actions";
import { DiscoverClient } from "./discover-client";

/**
 * `/discover` — member discovery: search, embedding-ranked creators, follow.
 *
 * Built against `design/manifest/screens/12-search-creators/design.md` (Figma
 * `Member/Search/Result/Creators` `1443:78153`).
 *
 * **Session-optional by design.** A signed-out member gets the same ranked results; only the
 * follow state differs (`DiscoveryPort` invariant 5 makes every row `"unknown"` without a
 * viewer). Nothing here redirects — this is the member front door the `/start` intent picker
 * now points at, and bouncing anonymous visitors to sign-up would defeat the point.
 *
 * `force-dynamic` + the lazy `createDb()` inside the action keep `next build` away from a live
 * database, matching `/creator/[id]`.
 */
export const dynamic = "force-dynamic";

/** Reachable-from-a-URL state: the query text and the selected tab. Both are untrusted. */
type DiscoverSearchParams = { q?: string | string[]; tab?: string | string[] };

/** `?q=a&q=b` is legal in a URL and meaningless here — take the first value. */
function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<DiscoverSearchParams>;
}) {
  const params = await searchParams;
  const q = first(params.q);
  // An unknown/absent tab falls back to Creators rather than 404-ing: a hand-edited URL should
  // land somewhere sensible, and Creators is the only tab with a data source this slice.
  const kind = ResultKindSchema.catch("creators").parse(first(params.tab));

  // Two different questions, so two parses. Here: "is this URL searchable at all?" — an empty box
  // or a 300-character paste is a *page state*, not a crash, so it is decided with `safeParse` and
  // rendered as the idle surface. The action then re-parses as the real trust boundary, because it
  // is also callable directly by a client and cannot inherit this one's verdict (golden rule 4).
  //
  // Read once, and before the search, because it decides *which question to ask*: it feeds the
  // Follow control's signed-out prompt (not inferable from the rows — an empty page carries no
  // `followState` to read the viewer off) and gates the personalized branch below.
  const signedIn = (await getWebSession(await headers())) !== null;

  // Three cases, and the difference between the first two is the whole of Slice B on this screen:
  //
  //   no query text + a viewer  → `{}`: omit `text` and the port ranks on the member's stored
  //                               interest embedding instead (`DiscoveryPort` invariant 8).
  //   no query text + no viewer → don't ask at all. The port would answer an empty page anyway,
  //                               so skipping spares an anonymous visit a pointless round trip.
  //   query text                → `{ text: q }`, exactly as before.
  //
  // A *blank* box is still not a personalized query: `?q=%20%20` arrives as `text: "  "`, which
  // trims to empty and fails `.min(1)` here — malformed input, not a request to be ranked for.
  const queryInput = q === "" ? (signedIn ? {} : null) : { text: q };
  const searchable =
    kind === "creators" && queryInput !== null
      ? CreatorDiscoveryQuerySchema.safeParse(queryInput)
      : null;

  const results: readonly CreatorResult[] = searchable?.success
    ? (await searchCreators(searchable.data)).results
    : [];

  return (
    <main className="flex flex-1 justify-center overflow-y-auto pl-10">
      <div className="flex w-151 shrink-0 flex-col gap-10 pt-10 pb-16">
        <DiscoverClient
          query={searchable?.success ? (searchable.data.text ?? "") : ""}
          kind={kind}
          results={results}
          signedIn={signedIn}
        />
      </div>
    </main>
  );
}
