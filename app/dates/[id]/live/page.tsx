import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Square, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import {
  elapsedMinutes,
  formatElapsed,
  getPlan,
  type Role,
} from "@/lib/datePlans";
import { signPaths } from "@/lib/memories";
import MomentCapture from "@/components/dates/MomentCapture";
import { deleteMoment, endDate } from "../../actions";
import { Button, Card, Pill, Screen } from "@/components/ui";

export const metadata = { title: "On a date" };

// Elapsed time is rendered on the server; without this it would be cached
// and the timer would read the same on every visit until something else
// invalidated the page.
export const dynamic = "force-dynamic";

type Moment = {
  id: string;
  note: string | null;
  storage_path: string | null;
  media_type: "image" | "video" | null;
  created_at: string;
};

function whoLabel(role: Role, partnerName: string) {
  if (role.who === "you") return "You";
  if (role.who === "them") return partnerName;
  return "Both";
}

export default async function LiveDatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOnboarded();
  const supabase = await createClient();

  const plan = await getPlan(supabase, id);
  if (!plan) notFound();

  // Landing here for a date that isn't running is a stale link or a back
  // button, not an error worth a screen of its own.
  if (plan.status !== "live") {
    redirect(plan.status === "done" ? `/dates/${id}/wrap` : `/dates/${id}`);
  }

  const { data } = await supabase
    .from("date_moments")
    .select("id, note, storage_path, media_type, created_at")
    .eq("date_plan_id", id)
    .order("created_at", { ascending: false });

  const moments = (data ?? []) as Moment[];

  const signed = await signPaths(
    supabase,
    moments.map((m) => m.storage_path).filter((p): p is string => Boolean(p))
  );

  const elapsed = formatElapsed(elapsedMinutes(plan));

  return (
    <Screen className="mx-auto max-w-2xl">
      <header className="mb-space-lg mt-space-lg">
        <Pill tone="primary" dot className="mb-space-sm">
          On a date{elapsed ? ` · ${elapsed}` : ""}
        </Pill>

        <h1 className="font-headline text-headline-lg text-on-surface text-balance">
          {plan.title}
        </h1>
      </header>

      <div className="mb-space-lg">
        <MomentCapture planId={plan.id} />
      </div>

      {/* The plan stays to hand but stays quiet — you're out, not reading. */}
      {(plan.activity || plan.roles.length > 0 || plan.notes) && (
        <details className="mb-space-lg">
          <summary className="cursor-pointer text-body-sm text-on-surface-variant transition hover:text-on-surface">
            The plan
          </summary>

          <Card elevation="flat" className="mt-space-sm space-y-space-md p-space-lg">
            {plan.activity && (
              <p className="text-body-md text-on-surface-variant leading-relaxed">
                {plan.activity}
              </p>
            )}

            {plan.roles.length > 0 && (
              <ul className="space-y-1">
                {plan.roles.map((role) => (
                  <li
                    key={role.label}
                    className="flex justify-between gap-space-md text-body-sm"
                  >
                    <span className="text-on-surface-variant">{role.label}</span>
                    <span className="text-on-surface">
                      {whoLabel(role, "Them")}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {plan.notes && (
              <p className="text-body-sm text-on-surface-variant">{plan.notes}</p>
            )}
          </Card>
        </details>
      )}

      {moments.length > 0 && (
        <ul className="mb-space-xl space-y-space-sm">
          {moments.map((moment) => {
            const url = moment.storage_path
              ? signed[moment.storage_path]
              : undefined;

            return (
              <li key={moment.id}>
                <Card elevation="flat" className="overflow-hidden p-0">
                  {url &&
                    (moment.media_type === "video" ? (
                      <video src={url} controls playsInline className="block w-full" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={url} alt="" className="block w-full" />
                    ))}

                  <div className="flex items-start justify-between gap-space-md p-space-md">
                    <div className="min-w-0">
                      {moment.note && (
                        <p className="whitespace-pre-wrap text-body-md text-on-surface">
                          {moment.note}
                        </p>
                      )}
                      <p className="mt-0.5 text-label-sm text-on-surface-variant">
                        {new Date(moment.created_at).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <form action={deleteMoment}>
                      <input type="hidden" name="id" value={moment.id} />
                      <input type="hidden" name="plan_id" value={plan.id} />
                      <input
                        type="hidden"
                        name="path"
                        value={moment.storage_path ?? ""}
                      />
                      <button
                        type="submit"
                        aria-label="Remove this"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-surface-variant transition hover:text-error"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </form>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <form action={endDate} className="mt-space-xl">
        <input type="hidden" name="id" value={plan.id} />
        <Button type="submit" variant="secondary" fullWidth>
          <Square className="h-4 w-4" aria-hidden />
          End the date
        </Button>
      </form>

      <p className="mt-space-sm text-center text-body-sm text-on-surface-variant">
        {moments.length > 0
          ? `${moments.length} kept so far — they'll become the memory.`
          : "Anything you keep becomes the memory afterwards."}
      </p>

      <p className="mt-space-lg text-center">
        <Link
          href={`/dates/${plan.id}`}
          className="text-body-sm text-on-surface-variant transition hover:text-on-surface"
        >
          Leave this running
        </Link>
      </p>
    </Screen>
  );
}
