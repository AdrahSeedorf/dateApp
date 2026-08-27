import Link from "next/link";

import { ImageIcon, MapPin, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { formatMemoryDate, signPaths, type Memory } from "@/lib/memories";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_center,#2d0f36,#050510_75%)] px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/home"
          className="text-white/50 hover:text-white mb-8 inline-block"
        >
          ← Our Journey
        </Link>

        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <p className="tracking-[0.35em] text-xs text-pink-200 mb-3">
              MEMORY VAULT
            </p>
            <h1 className="text-4xl md:text-5xl font-bold">Our memories</h1>
          </div>

          <Link
            href="/memories/new"
            className="shrink-0 px-5 py-3 rounded-full bg-pink-500 hover:bg-pink-400 transition font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add
          </Link>
        </div>

        {memories.length === 0 ? (
          <div className="rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-12 text-center">
            <ImageIcon className="w-10 h-10 text-pink-300/60 mx-auto mb-5" />
            <h2 className="text-xl font-semibold mb-3">Nothing here yet</h2>
            <p className="text-white/50 mb-8 max-w-sm mx-auto leading-relaxed">
              Add the first one. A photo, a date, where you were — enough that
              it still means something in ten years.
            </p>
            <Link
              href="/memories/new"
              className="inline-block px-6 py-3 rounded-full bg-pink-500 hover:bg-pink-400 transition text-sm font-semibold"
            >
              Add a memory
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {memories.map((memory) => {
              const cover = memory.memory_media?.find(
                (m) => m.media_type === "image"
              )?.storage_path;
              const coverUrl = cover ? signed[cover] : undefined;
              const mediaCount = memory.memory_media?.length ?? 0;

              return (
                <Link
                  key={memory.id}
                  href={`/memories/${memory.id}`}
                  className="rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl overflow-hidden hover:border-pink-300/50 transition block"
                >
                  <div className="aspect-[4/3] bg-black/30 flex items-center justify-center overflow-hidden">
                    {coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={coverUrl}
                        alt={memory.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-white/15" />
                    )}
                  </div>

                  <div className="p-5">
                    <h2 className="font-semibold mb-2 line-clamp-1">
                      {memory.title}
                    </h2>

                    <p className="text-white/40 text-xs mb-2">
                      {formatMemoryDate(memory.memory_date)}
                      {mediaCount > 0 && ` · ${mediaCount} file${mediaCount > 1 ? "s" : ""}`}
                    </p>

                    {memory.location && (
                      <p className="text-white/50 text-sm flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 shrink-0" />
                        <span className="line-clamp-1">{memory.location}</span>
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
