import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { formatElapsed, getPlan } from "@/lib/datePlans";
import { signPaths } from "@/lib/memories";
import WrapUpForm from "@/components/dates/WrapUpForm";
import { Card, Screen, ScreenHeader } from "@/components/ui";

export const metadata = { title: "How was it?" };

type Moment = {
  id: string;
  note: string | null;
  storage_path: string | null;
  media_type: "image" | "video" | null;
  created_at: string;
};

export default async function WrapUpPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOnboarded();
  const supabase = await createClient();

  const plan = await getPlan(supabase, id);
  if (!plan) notFound();

  if (plan.status !== "done") redirect(`/dates/${id}`);

  // Already written up — no second memory for the same evening.
  if (plan.memory_id) redirect(`/memories/${plan.memory_id}`);

  const { data } = await supabase
    .from("date_moments")
    .select("id, note, storage_path, media_type, created_at")
    .eq("date_plan_id", id)
    .order("created_at", { ascending: true });

  const moments = (data ?? []) as Moment[];

  const signed = await signPaths(
    supabase,
    moments.map((m) => m.storage_path).filter((p): p is string => Boolean(p))
  );

  /**
   * The evening, in the order it happened.
   *
   * Notes are joined into a draft rather than dropped into a blank box: the
   * words already exist, and asking someone to rewrite them at midnight is
   * how a date fails to become a memory. It stays editable — this is a
   * starting point, not a transcript.
   */
  const draft = moments
    .map((m) => m.note?.trim())
    .filter((note): note is string => Boolean(note))
    .join("\n\n");

  const photos = moments.filter((m) => m.storage_path);

  const elapsed = formatElapsed(
    plan.started_at && plan.ended_at
      ? Math.max(
          0,
          Math.floor(
            (new Date(plan.ended_at).getTime() -
              new Date(plan.started_at).getTime()) /
              60_000
          )
        )
      : null
  );

  return (
    <Screen className="mx-auto max-w-2xl">
      <Link
        href="/dates"
        className="mt-space-lg inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
      >
        ← Plan a date
      </Link>

      <ScreenHeader
        eyebrow={elapsed ? `That was ${elapsed}` : "Just now"}
        title={
          <>
            How was <em>{plan.title}</em>?
          </>
        }
        body={
          moments.length > 0
            ? "Everything you kept is here. Change anything, then put it in the vault."
            : "Nothing was captured on the night — write what you want to remember."
        }
      />

      {photos.length > 0 && (
        <Card elevation="flat" className="mb-space-lg p-space-md">
          <p className="mb-space-sm text-label-sm text-on-surface-variant tracking-[0.15em]">
            {photos.length} {photos.length === 1 ? "PHOTO" : "PHOTOS"} FROM THE NIGHT
          </p>

          <ul className="grid grid-cols-3 gap-space-sm sm:grid-cols-4">
            {photos.map((moment) => {
              const url = moment.storage_path
                ? signed[moment.storage_path]
                : undefined;
              if (!url) return null;

              return (
                <li
                  key={moment.id}
                  className="aspect-square overflow-hidden rounded-md bg-surface-container-lowest"
                >
                  {moment.media_type === "video" ? (
                    <video src={url} className="h-full w-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  )}
                </li>
              );
            })}
          </ul>

          <p className="mt-space-sm text-body-sm text-on-surface-variant">
            These come across automatically.
          </p>
        </Card>
      )}

      <WrapUpForm
        planId={plan.id}
        defaultTitle={plan.title}
        defaultDescription={draft}
        defaultLocation={plan.location_type ?? ""}
        // The day it was scheduled, not today: a date that ends after
        // midnight belongs to the evening it started.
        defaultDate={plan.scheduled_for ?? ""}
      />
    </Screen>
  );
}
