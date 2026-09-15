import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { formatMemoryDate, signPaths, type Memory } from "@/lib/memories";
import { Card, Screen } from "@/components/ui";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function MemoryDetailPage({ params }: Props) {
  const { id } = await params;
  await requireOnboarded();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("memories")
    .select(
      "id, title, description, memory_date, location, created_at, date_plan_id, memory_media(id, storage_path, media_type), date_plans(id, title)"
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
  const signed = await signPaths(
    supabase,
    media.map((m) => m.storage_path)
  );

  return (
    <Screen className="mx-auto max-w-3xl">
      <Link
        href="/memories"
        className="mt-space-lg mb-space-xl inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
      >
        ← Our memories
      </Link>

      <h1 className="font-headline text-headline-lg md:text-display-lg-mobile text-on-surface mb-space-md text-balance">
        {memory.title}
      </h1>

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
            if (!url) return null;

            return (
              <div
                key={item.storage_path}
                className="overflow-hidden rounded-xl border border-[var(--glass-rim)] bg-surface-container-lowest"
              >
                {item.media_type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt=""
                    loading="lazy"
                    className="block h-auto w-full"
                  />
                ) : (
                  <video
                    src={url}
                    controls
                    playsInline
                    className="block h-auto w-full"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {media.length === 0 && !memory.description && (
        <p className="text-body-md text-on-surface-variant">
          No photos or notes on this one yet.
        </p>
      )}
    </Screen>
  );
}
