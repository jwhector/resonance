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
  const searchable =
    kind === "creators" ? CreatorDiscoveryQuerySchema.safeParse({ text: q }) : null;

  const results: readonly CreatorResult[] = searchable?.success
    ? (await searchCreators(searchable.data)).results
    : [];

  // Read once for the Follow control's signed-out prompt. Not inferable from the rows: a page with
  // no results carries no `followState` to read the viewer off, and the prompt must work there too.
  const signedIn = (await getWebSession(await headers())) !== null;

  return (
    <main className="flex flex-1 justify-center overflow-y-auto pl-10">
      <div className="flex w-151 shrink-0 flex-col gap-10 pt-10 pb-16">
        <DiscoverClient
          query={searchable?.success ? searchable.data.text : ""}
          kind={kind}
          results={results}
          signedIn={signedIn}
        />
      </div>
    </main>
  );
}
