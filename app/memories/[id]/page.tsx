import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Sparkles, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { getPartner } from "@/lib/couple";
import {
  formatMemoryDate,
  ordinalYear,
  relationshipYear,
  signPaths,
  type Memory,
  type Reflection,
} from "@/lib/memories";
import Reflections from "@/components/memories/Reflections";
import MediaItem from "@/components/memories/MediaItem";
import DeleteMemory from "@/components/memories/DeleteMemory";
import { toggleFavourite } from "../actions";
import { Card, Pill, Screen } from "@/components/ui";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MemoryDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireOnboarded();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("memories")
    .select(
      "id, title, description, memory_date, location, category, is_favourite, created_at, date_plan_id, memory_media(id, storage_path, media_type, is_cover), date_plans(id, title)"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[memory] detail query failed", error.message);
  }

  // RLS means another couple's memory simply returns nothing, so this
  // doubles as the authorisation check.
  if (!data) notFound();

  type PlanRef = { id: string; title: string };

  // PostgREST returns an embedded relation as an array unless it can prove
  // the relationship is to-one. Normalise so either shape works.
  const memory = data as unknown as Memory & {
    date_plans?: PlanRef[] | PlanRef | null;
  };

  const fromPlan: PlanRef | null = Array.isArray(memory.date_plans)
    ? memory.date_plans[0] ?? null
    : memory.date_plans ?? null;

  const media = memory.memory_media ?? [];

  const [signed, partner, { data: couple }, { data: reflectionRows }] =
    await Promise.all([
      signPaths(
        supabase,
        media.map((m) => m.storage_path)
      ),
      getPartner(supabase, session.userId, session.coupleId),
      session.coupleId
        ? supabase
            .from("couples")
            .select("started_at")
            .eq("id", session.coupleId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      // Private reflections belonging to the other person are filtered out by
      // RLS before they get here — there is nothing to exclude in this code.
      supabase
        .from("memory_reflections")
        .select("id, memory_id, author_id, body, is_private, created_at")
        .eq("memory_id", id)
        .order("created_at", { ascending: true }),
    ]);

  const reflections = (reflectionRows ?? []) as Reflection[];

  const year = relationshipYear(
    memory.memory_date,
    couple?.started_at ?? null
  );

  return (
    <Screen className="mx-auto max-w-3xl">
      <Link
        href="/memories"
        className="mt-space-lg mb-space-xl inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
      >
        ← Our memories
      </Link>

      <div className="mb-space-md flex items-start justify-between gap-space-md">
        <h1 className="font-headline text-headline-lg md:text-display-lg-mobile text-on-surface text-balance">
          {memory.title}
        </h1>

        {/* Favourites are shared — either of you can star a memory. */}
        <form action={toggleFavourite} className="shrink-0 pt-2">
          <input type="hidden" name="id" value={memory.id} />
          <input
            type="hidden"
            name="next"
            value={String(!memory.is_favourite)}
          />
          <button
            type="submit"
            aria-pressed={Boolean(memory.is_favourite)}
            aria-label={
              memory.is_favourite ? "Remove from favourites" : "Add to favourites"
            }
            className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--glass-rim)] transition hover:bg-[var(--glass-2)]"
          >
            <Star
              className={
                memory.is_favourite
                  ? "h-5 w-5 fill-tertiary text-tertiary"
                  : "h-5 w-5 text-on-surface-variant"
              }
              aria-hidden
            />
          </button>
        </form>
      </div>

      {(memory.category || year) && (
        <div className="mb-space-md flex flex-wrap gap-space-sm">
          {memory.category && <Pill tone="secondary">{memory.category}</Pill>}
          {year && <Pill tone="tertiary">{ordinalYear(year)}</Pill>}
        </div>
      )}

      <div className="mb-space-xl flex flex-wrap items-center gap-space-lg text-body-sm text-on-surface-variant">
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" aria-hidden />
          {formatMemoryDate(memory.memory_date)}
        </span>

        {memory.location && (
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4" aria-hidden />
            {memory.location}
          </span>
        )}

        {fromPlan && (
          <Link
            href="/dates"
            className="flex items-center gap-2 text-primary transition hover:text-primary-container"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            From a planned date
          </Link>
        )}
      </div>

      {memory.description && (
        <Card className="mb-space-xl p-8">
          {/* body-lg with a generous measure: this is the one place in the
              app someone actually reads rather than scans. */}
          <p className="text-body-lg text-on-surface/90 leading-relaxed whitespace-pre-wrap">
            {memory.description}
          </p>
        </Card>
      )}

      {media.length > 0 && (
        <div className="space-y-space-md">
          {media.map((item) => {
            const url = signed[item.storage_path];
            if (!url || !item.id) return null;

            return (
              <MediaItem
                key={item.id}
                item={{ ...item, id: item.id }}
                memoryId={memory.id}
                url={url}
                alt={memory.title}
              />
            );
          })}
        </div>
      )}

      {media.length === 0 && !memory.description && (
        <p className="text-body-md text-on-surface-variant">
          No photos or notes on this one yet.
        </p>
      )}

      <Reflections
        memoryId={memory.id}
        viewerId={session.userId}
        partnerName={partner?.displayName ?? null}
        reflections={reflections}
      />

      <DeleteMemory
        memoryId={memory.id}
        partnerName={partner?.displayName ?? null}
      />
    </Screen>
  );
}
