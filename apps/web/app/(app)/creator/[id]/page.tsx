import { notFound } from "next/navigation";
import { createDb, getCreatorProfileById } from "@resonance/db";

/**
 * `/creator/[id]` — the read-only creator profile. Originally just the success screen shown
 * right after a commit; as of Slice A it is also **where a `/discover` result row lands**, so it
 * has to render the whole saved row rather than the subset onboarding happened to care about.
 *
 * That is why `offerings` is here now: the column has existed since the ProfileGen slice and
 * `commitCreatorProfile` has always written it, but nothing rendered it — a creator arriving from
 * search would have seen a profile with the actual offer missing.
 *
 * The segment is the profile's own id (the uuid `commitCreatorProfile` returns and the commit
 * action redirects to), because `getCreatorProfileById` looks a profile up by its primary key —
 * Better Auth user ids are not profile uuids. `force-dynamic` + a lazy `createDb()` keep
 * `next build` from touching a live database.
 *
 * The 80px app rail comes from the shared `(app)` layout, so this `<main>` owns its own vertical
 * scrolling within the row rather than being the page's scroll container.
 */
export const dynamic = "force-dynamic";

export default async function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCreatorProfileById(createDb(), id);
  if (!profile) notFound();

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 overflow-y-auto px-6 py-16">
      <span className="w-fit rounded-pill bg-success-subtle px-4 py-1 text-sm font-medium text-success">
        Profile published
      </span>

      <header className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">{profile.displayName}</h1>
        <p className="text-lg text-muted">{profile.headline}</p>
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">About</h2>
        <p className="whitespace-pre-wrap text-base text-foreground">{profile.bio}</p>
      </section>

      {/* Offerings — `{title, description}` only. There is no price, image, or product/service
          type in the schema yet (Slice C owns commerce modelling), so this renders exactly what
          exists and invents no affordance to buy. */}
      {profile.offerings.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">Offerings</h2>
          <ul className="flex flex-col gap-4">
            {profile.offerings.map((offering) => (
              <li
                key={offering.title}
                className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4"
              >
                <h3 className="text-base font-medium text-foreground">{offering.title}</h3>
                <p className="whitespace-pre-wrap text-base text-muted">{offering.description}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.tags.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium uppercase tracking-wide text-subtle">
            Search keywords
          </h2>
          <ul className="flex flex-wrap gap-2">
            {profile.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-pill bg-surface-muted px-3 py-1 text-sm text-foreground"
              >
                {tag}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
