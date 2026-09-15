import Link from "next/link";
import { RotateCcw, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { formatMemoryDate, MEDIA_BUCKET, type Memory } from "@/lib/memories";
import { restoreMemory } from "../actions";
import { Button, Card, Screen, ScreenHeader } from "@/components/ui";

export const metadata = { title: "Recently deleted" };

type Deleted = Memory & { deleted_at: string };

/** Whole days left before this is gone for good. */
function daysLeft(deletedAt: string): number {
  const gone = new Date(deletedAt).getTime() + 30 * 86_400_000;
  return Math.max(0, Math.ceil((gone - Date.now()) / 86_400_000));
}

export default async function DeletedMemoriesPage() {
  await requireOnboarded();
  const supabase = await createClient();

  // Opportunistic purge: anything past thirty days goes now, and the paths
  // come back so the files can follow. Doing it here rather than on a
  // schedule keeps the whole feature inside the app — the only cost is that
  // a bin nobody opens holds its rows a little longer than promised.
  const { data: purged, error: purgeError } = await supabase.rpc(
    "purge_deleted_memories"
  );

  if (purgeError) {
    console.error("[memories] purge failed", purgeError.message);
  }

  const paths = (purged ?? [])
    .map((row: { storage_path?: string }) => row.storage_path)
    .filter((p: string | undefined): p is string => Boolean(p));

  if (paths.length > 0) {
    const { error } = await supabase.storage.from(MEDIA_BUCKET).remove(paths);

    if (error) {
      console.error("[memories] purge storage remove failed", error.message);
    }
  }

  // Deleted rows are hidden from every ordinary query by the read policy, so
  // this goes through the function that is allowed to see them.
  const { data, error } = await supabase.rpc("deleted_memories");

  if (error) {
    console.error("[memories] deleted list failed", error.message);
  }

  const memories = (data ?? []) as Deleted[];

  return (
    <Screen className="mx-auto max-w-3xl">
      <Link
        href="/memories"
        className="mt-space-lg inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
      >
        ← Our memories
      </Link>

      <ScreenHeader
        eyebrow="Recently deleted"
        title="Still here, for now"
        body="Anything deleted stays for 30 days, then goes for good — photos and all."
      />

      {memories.length === 0 ? (
        <Card className="p-12 text-center">
          <Trash2
            className="mx-auto mb-space-md h-8 w-8 text-on-surface-variant/40"
            aria-hidden
          />
          <p className="text-body-md text-on-surface-variant">
            Nothing deleted.
          </p>
        </Card>
      ) : (
        <ul className="space-y-space-sm">
          {memories.map((memory) => {
            const left = daysLeft(memory.deleted_at);

            return (
              <li key={memory.id}>
                <Card
                  elevation="flat"
                  className="flex flex-wrap items-center justify-between gap-space-md p-space-lg"
                >
                  <div className="min-w-0">
                    <p className="text-title-md text-on-surface">
                      {memory.title}
                    </p>
                    <p className="text-label-sm text-on-surface-variant">
                      {formatMemoryDate(memory.memory_date)}
                      {" · "}
                      {left === 0
                        ? "gone today"
                        : left === 1
                          ? "1 day left"
                          : `${left} days left`}
                    </p>
                  </div>

                  <form action={restoreMemory}>
                    <input type="hidden" name="id" value={memory.id} />
                    <Button type="submit" size="sm" variant="secondary">
                      <RotateCcw className="h-4 w-4" aria-hidden />
                      Restore
                    </Button>
                  </form>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </Screen>
  );
}
