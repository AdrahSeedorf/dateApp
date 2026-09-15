import Link from "next/link";

import { ImageIcon, MapPin, Plus, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import {
  coverPathFor,
  formatMemoryDate,
  signPaths,
  type Memory,
} from "@/lib/memories";
import { Button, Card, Pill, Screen, ScreenHeader, cn } from "@/components/ui";

type Props = {
  searchParams: Promise<{ filter?: string }>;
};

export default async function MemoriesPage({ searchParams }: Props) {
  const { filter } = await searchParams;
  await requireOnboarded();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("memories")
    .select(
      "id, title, description, memory_date, location, category, is_favourite, created_at, memory_media(id, storage_path, media_type, is_cover)"
    )
    .order("memory_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[memories] list query failed", error.message);
  }

  const all = (data ?? []) as Memory[];

  // A failed query and an empty vault are very different things, and
  // rendering both as "nothing here yet" is how a missing migration
  // disguised itself as no memories. Say which it is.
  if (error) {
    return (
      <Screen withNav className="mx-auto max-w-5xl">
        <Link
          href="/home"
          className="mt-space-lg inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
        >
          ← Our Journey
        </Link>

        <ScreenHeader eyebrow="Memory vault" title="Couldn't load these" />

        <Card className="p-space-xl">
          <p className="mb-space-md text-body-md text-on-surface-variant leading-relaxed">
            Your memories are still there — this screen just couldn&apos;t read
            them. Usually that means a database migration hasn&apos;t been run.
          </p>
          <p className="font-mono text-body-sm text-error break-words">
            {error.message}
          </p>
        </Card>
      </Screen>
    );
  }

  // Filters are built from the categories actually in use rather than a fixed
  // list, so a couple's own vocabulary is what they get to filter by.
  const categories = [...new Set(all.map((m) => m.category).filter(Boolean))]
    .sort() as string[];

  const hasFavourites = all.some((m) => m.is_favourite);

  const memories =
    filter === "favourites"
      ? all.filter((m) => m.is_favourite)
      : filter
        ? all.filter((m) => m.category === filter)
        : all;

  // One signed URL per memory is enough for the grid.
  const coverPaths = memories
    .map(coverPathFor)
    .filter((path): path is string => Boolean(path));

  const signed = await signPaths(supabase, coverPaths);

  const filters = [
    { key: "", label: "All", href: "/memories" },
    ...(hasFavourites
      ? [
          {
            key: "favourites",
            label: "Favourites",
            href: "/memories?filter=favourites",
          },
        ]
      : []),
    ...categories.map((category) => ({
      key: category,
      label: category,
      href: `/memories?filter=${encodeURIComponent(category)}`,
    })),
  ];

  return (
    <Screen withNav className="mx-auto max-w-5xl">
      <Link
        href="/home"
        className="mt-space-lg inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
      >
        ← Our Journey
      </Link>

      <ScreenHeader
        eyebrow="Memory vault"
        title={
          <>
            Our <em>memories</em>
          </>
        }
        action={
          <Button href="/memories/new" size="sm">
            <Plus className="h-4 w-4" aria-hidden />
            Add
          </Button>
        }
      />

      {/* Real links rather than client-side state: filters survive a refresh,
          can be shared, and work before hydration. */}
      {filters.length > 1 && (
        <nav aria-label="Filter memories" className="mb-space-lg">
          <ul className="flex gap-space-sm overflow-x-auto scrollbar-none pb-1">
            {filters.map((option) => {
              const active = (filter ?? "") === option.key;

              return (
                <li key={option.key || "all"} className="shrink-0">
                  <Link
                    href={option.href}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "block min-h-[44px] rounded-full border px-4 py-2 text-label-md transition",
                      active
                        ? "border-primary bg-[rgb(var(--c-glow-a)/0.18)] text-on-surface font-semibold"
                        : "border-[var(--glass-rim)] bg-[var(--glass-1)] text-on-surface-variant hover:text-on-surface"
                    )}
                  >
                    {option.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      {memories.length === 0 && filter ? (
        <Card className="p-12 text-center">
          <h2 className="mb-space-sm font-headline text-headline-sm text-on-surface">
            Nothing in here
          </h2>
          <p className="mb-space-lg text-body-md text-on-surface-variant">
            No memories match that filter yet.
          </p>
          <Button href="/memories" size="sm" variant="secondary">
            Show everything
          </Button>
        </Card>
      ) : memories.length === 0 ? (
        <Card className="p-12 text-center">
          <ImageIcon
            className="mx-auto mb-space-md h-10 w-10 text-primary/60"
            aria-hidden
          />
          <h2 className="font-headline text-headline-sm text-on-surface mb-space-sm">
            Nothing here yet
          </h2>
          <p className="mx-auto mb-space-xl max-w-sm text-body-md text-on-surface-variant leading-relaxed">
            Add the first one. A photo, a date, where you were — enough that it
            still means something in ten years.
          </p>
          <Button href="/memories/new" size="sm">
            Add a memory
          </Button>
        </Card>
      ) : (
        <div className="grid gap-space-lg sm:grid-cols-2 lg:grid-cols-3">
          {memories.map((memory) => {
            const cover = coverPathFor(memory);
            const coverUrl = cover ? signed[cover] : undefined;
            const mediaCount = memory.memory_media?.length ?? 0;

            return (
              // flat, not glass: a grid of these is a lot of backdrop-filter
              // layers to composite while scrolling on a phone.
              <Card
                key={memory.id}
                as={Link}
                elevation="flat"
                interactive
                href={`/memories/${memory.id}`}
                className="block overflow-hidden p-0 transition hover:border-primary/50"
              >
                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-surface-container-lowest">
                  {coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon
                      className="h-8 w-8 text-on-surface-variant/25"
                      aria-hidden
                    />
                  )}
                </div>

                <div className="p-space-lg">
                  <h2 className="text-title-md text-on-surface mb-space-xs flex items-center gap-2">
                    {memory.is_favourite && (
                      <Star
                        className="h-3.5 w-3.5 shrink-0 fill-tertiary text-tertiary"
                        aria-label="Favourite"
                      />
                    )}
                    <span className="line-clamp-1">{memory.title}</span>
                  </h2>

                  {memory.category && (
                    <Pill tone="secondary" className="mb-space-xs">
                      {memory.category}
                    </Pill>
                  )}

                  <p className="text-label-sm text-on-surface-variant mb-space-xs">
                    {formatMemoryDate(memory.memory_date)}
                    {mediaCount > 0 &&
                      ` · ${mediaCount} file${mediaCount > 1 ? "s" : ""}`}
                  </p>

                  {memory.location && (
                    <p className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                      <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="line-clamp-1">{memory.location}</span>
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Screen>
  );
}
