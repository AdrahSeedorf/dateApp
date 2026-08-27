import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { formatMemoryDate, signPaths, type Memory } from "@/lib/memories";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_center,#2d0f36,#050510_75%)] px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/memories"
          className="text-white/50 hover:text-white mb-8 inline-block"
        >
          ← Our memories
        </Link>

        <h1 className="text-3xl md:text-5xl font-bold mb-5">{memory.title}</h1>

        <div className="flex flex-wrap items-center gap-5 text-white/50 text-sm mb-10">
          <span className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {formatMemoryDate(memory.memory_date)}
          </span>

          {memory.location && (
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {memory.location}
            </span>
          )}

          {fromPlan && (
            <Link
              href="/dates"
              className="flex items-center gap-2 text-pink-300 hover:text-pink-200"
            >
              <Sparkles className="w-4 h-4" />
              From a planned date
            </Link>
          )}
        </div>

        {memory.description && (
          <div className="rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-8 mb-10">
            <p className="text-white/80 leading-relaxed whitespace-pre-wrap">
              {memory.description}
            </p>
          </div>
        )}

        {media.length > 0 && (
          <div className="space-y-5">
            {media.map((item) => {
              const url = signed[item.storage_path];
              if (!url) return null;

              return (
                <div
                  key={item.storage_path}
                  className="rounded-3xl overflow-hidden border border-white/10 bg-black/30"
                >
                  {item.media_type === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={memory.title}
                      className="block w-full h-auto"
                    />
                  ) : (
                    <video
                      src={url}
                      controls
                      playsInline
                      className="block w-full h-auto"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {media.length === 0 && !memory.description && (
          <p className="text-white/40">
            No photos or notes on this one yet.
          </p>
        )}
      </div>
    </main>
  );
}
