import Link from "next/link";
import { CalendarDays, Images, MapPin, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import {
  buildTimeline,
  describeUpcoming,
  formatMilestoneDate,
  listMilestones,
} from "@/lib/milestones";
import { deleteMilestone } from "./actions";
import {
  Button,
  Card,
  Pill,
  Screen,
  ScreenHeader,
  Timeline,
  TimelineItem,
} from "@/components/ui";

export const metadata = { title: "Timeline" };

export default async function TimelinePage() {
  const session = await requireOnboarded();
  const supabase = await createClient();

  const { data: couple } = session.coupleId
    ? await supabase
        .from("couples")
        .select("started_at")
        .eq("id", session.coupleId)
        .maybeSingle()
    : { data: null };

  const { milestones, error } = await listMilestones(supabase);
  const entries = buildTimeline(milestones, couple?.started_at ?? null);

  const past = entries.filter((e) => !e.upcoming);
  const upcoming = entries.filter((e) => e.upcoming);

  return (
    <Screen withNav className="mx-auto max-w-2xl">
      <Link
        href="/home"
        className="mt-space-lg inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
      >
        ← Our Journey
      </Link>

      <ScreenHeader
        eyebrow="Our living story"
        title={
          <>
            The <em>spine</em> of it
          </>
        }
        body="What's happened, and what's still coming."
        action={
          <Button href="/timeline/new" size="sm">
            <Plus className="h-4 w-4" aria-hidden />
            Add
          </Button>
        }
      />

      {error && (
        <p role="alert" className="mb-space-lg text-body-sm text-error">
          {error}
        </p>
      )}

      {entries.length === 0 && (
        <Card className="p-12 text-center">
          <h2 className="mb-space-sm font-headline text-headline-sm text-on-surface">
            Nothing marked yet
          </h2>
          <p className="mx-auto mb-space-xl max-w-sm text-body-md text-on-surface-variant leading-relaxed">
            Start with the day you met. You can add things that haven&apos;t
            happened yet too — they sit on the same line, waiting.
          </p>
          <Button href="/timeline/new" size="sm">
            Add the first one
          </Button>
        </Card>
      )}

      {past.length > 0 && (
        <Timeline className="mb-space-xl">
          {past.map((entry) => (
            <TimelineItem key={entry.id} tone={entry.anchor ? "tertiary" : "primary"}>
              <Card elevation="flat" className="p-space-lg">
                <div className="flex items-start justify-between gap-space-md">
                  <div className="min-w-0">
                    <h2 className="font-headline text-headline-sm text-on-surface">
                      {entry.icon && <span aria-hidden>{entry.icon} </span>}
                      {entry.title}
                    </h2>

                    <p className="mt-0.5 flex flex-wrap items-center gap-x-space-md gap-y-1 text-label-sm text-on-surface-variant">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3 w-3" aria-hidden />
                        {formatMilestoneDate(entry.date)}
                      </span>

                      {entry.place && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3" aria-hidden />
                          {entry.place}
                        </span>
                      )}
                    </p>
                  </div>

                  {entry.anchor && <Pill tone="tertiary">Day one</Pill>}
                </div>

                {entry.note && (
                  <p className="mt-space-sm text-body-md text-on-surface-variant leading-relaxed">
                    {entry.note}
                  </p>
                )}

                {entry.memoryId && (
                  <Link
                    href={`/memories/${entry.memoryId}`}
                    className="mt-space-sm inline-flex items-center gap-2 text-body-sm text-primary transition hover:text-primary-container"
                  >
                    <Images className="h-4 w-4" aria-hidden />
                    See the photos
                  </Link>
                )}

                {/* The anchor is couples.started_at, not a row — it's
                    changed from the profile page, not deleted here. */}
                {!entry.anchor && (
                  <form action={deleteMilestone} className="mt-space-sm">
                    <input type="hidden" name="id" value={entry.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant transition hover:text-error"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                      Remove
                    </button>
                  </form>
                )}
              </Card>
            </TimelineItem>
          ))}
        </Timeline>
      )}

      {upcoming.length > 0 && (
        <>
          <h2 className="mb-space-md font-headline text-headline-sm text-tertiary">
            Still to come
          </h2>

          <Timeline>
            {upcoming.map((entry) => (
              <TimelineItem key={entry.id} tone="tertiary">
                <Card elevation="flat" className="p-space-lg">
                  <div className="flex items-start justify-between gap-space-md">
                    <div className="min-w-0">
                      <h3 className="font-headline text-headline-sm text-tertiary">
                        {entry.icon && <span aria-hidden>{entry.icon} </span>}
                        {entry.title}
                      </h3>

                      <p className="mt-0.5 text-label-sm text-on-surface-variant">
                        {formatMilestoneDate(entry.date)}
                      </p>
                    </div>

                    {entry.daysAway !== null && (
                      <Pill tone="tertiary">
                        {describeUpcoming(entry.daysAway)}
                      </Pill>
                    )}
                  </div>

                  {entry.note && (
                    <p className="mt-space-sm text-body-md text-on-surface-variant leading-relaxed">
                      {entry.note}
                    </p>
                  )}

                  <form action={deleteMilestone} className="mt-space-sm">
                    <input type="hidden" name="id" value={entry.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant transition hover:text-error"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                      Remove
                    </button>
                  </form>
                </Card>
              </TimelineItem>
            ))}
          </Timeline>
        </>
      )}

      {!couple?.started_at && (
        <Card
          as={Link}
          href="/profile"
          elevation="flat"
          className="mt-space-xl block p-space-lg transition hover:border-primary/50"
        >
          <p className="text-body-sm text-on-surface-variant">
            Set your start date on your profile and day one appears here.
          </p>
        </Card>
      )}
    </Screen>
  );
}
