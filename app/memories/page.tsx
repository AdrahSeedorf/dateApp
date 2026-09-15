import Link from "next/link";

import { ImageIcon, MapPin, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { formatMemoryDate, signPaths, type Memory } from "@/lib/memories";
import { Button, Card, Screen, ScreenHeader } from "@/components/ui";

export default async function MemoriesPage() {
  await requireOnboarded();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("memories")
    .select(
      "id, title, description, memory_date, location, created_at, memory_media(storage_path, media_type)"
    )
    .order("memory_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[memories] list query failed", error.message);
  }

  const memories = (data ?? []) as Memory[];

  // One signed URL per memory is enough for the grid — first image if there
  // is one, otherwise nothing.
  const coverPaths = memories
    .map(
      (memory) =>
        memory.memory_media?.find((m) => m.media_type === "image")
          ?.storage_path
    )
    .filter((path): path is string => Boolean(path));

  const signed = await signPaths(supabase, coverPaths);

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

      {memories.length === 0 ? (
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
            const cover = memory.memory_media?.find(
              (m) => m.media_type === "image"
            )?.storage_path;
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
                  <h2 className="text-title-md text-on-surface mb-space-xs line-clamp-1">
                    {memory.title}
                  </h2>

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
