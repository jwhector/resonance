import { notFound } from "next/navigation";
import { createDb, getCreatorProfileById } from "@resonance/db";

/**
 * `/creator/[id]` — the placeholder profile view shown right after a commit. A read-only RSC
 * success screen that reads the saved row and renders it plainly.
 *
 * The segment is the profile's own id (the uuid `commitCreatorProfile` returns and the commit
 * action redirects to), because `getCreatorProfileById` looks a profile up by its primary key —
 * the public `@resonance/db` surface exposes no by-user lookup, and Better Auth user ids are
 * not profile uuids. `force-dynamic` + a lazy `createDb()` keep `next build` from touching a
 * live database.
 */
export const dynamic = "force-dynamic";

export default async function CreatorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getCreatorProfileById(createDb(), id);
  if (!profile) notFound();

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-8 px-6 py-16">
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
