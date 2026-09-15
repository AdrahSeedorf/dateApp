import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  Images,
  Infinity as InfinityIcon,
  Mail,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { getPartner } from "@/lib/couple";
import { greeting } from "@/lib/anniversary";
import { isUnlockable, listLetters } from "@/lib/letters";
import {
  buildTimeline,
  describeUpcoming,
  listMilestones,
} from "@/lib/milestones";
import { signPaths, type Memory } from "@/lib/memories";
import ChapterCard from "@/components/home/ChapterCard";
import FirstSteps, { type Step } from "@/components/home/FirstSteps";
import {
  Card,
  Pill,
  Screen,
  Section,
} from "@/components/ui";

export const metadata = { title: "Our Journey" };

export default async function HomePage() {
  const session = await requireOnboarded();
  const supabase = await createClient();

  // Signed in but not attached to a couple yet.
  if (!session.coupleId) {
    return (
      <Screen className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <h1 className="mb-space-md font-headline text-headline-md text-on-surface">
            Almost there
          </h1>
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            Your account isn&apos;t linked to anyone yet. If you were sent an
            invite link, open that link to finish setting things up.
          </p>
        </Card>
      </Screen>
    );
  }

  const [partner, { data: couple }, { letters }, { milestones }] =
    await Promise.all([
      getPartner(supabase, session.userId, session.coupleId),
      supabase
        .from("couples")
        .select("name, started_at")
        .eq("id", session.coupleId)
        .maybeSingle(),
      listLetters(supabase),
      listMilestones(supabase),
    ]);

  const [{ data: recentMemories }, { count: memoryCount }, { count: planCount }] =
    await Promise.all([
      supabase
        .from("memories")
        .select("id, title, memory_date, memory_media(storage_path, media_type)")
        .order("memory_date", { ascending: false, nullsFirst: false })
        .limit(4),
      supabase.from("memories").select("id", { count: "exact", head: true }),
      supabase.from("date_plans").select("id", { count: "exact", head: true }),
    ]);

  const memories = (recentMemories ?? []) as Memory[];

  const coverPaths = memories
    .map(
      (m) => m.memory_media?.find((x) => x.media_type === "image")?.storage_path
    )
    .filter((p): p is string => Boolean(p));

  const signed = await signPaths(supabase, coverPaths);

  // Letters waiting for this person specifically. The strongest reason to
  // open the app, so it goes above everything else.
  const waitingForYou = letters.filter(
    (l) => isUnlockable(l) && l.recipient_id === session.userId
  );

  const nextMilestone = buildTimeline(
    milestones,
    couple?.started_at ?? null
  ).find((e) => e.upcoming);

  const steps: Step[] = [
    {
      key: "partner",
      label: "Invite your partner",
      detail: "Almost nothing here works alone.",
      href: "/profile",
      done: Boolean(partner),
    },
    {
      key: "started",
      label: "Set the day it started",
      detail: "Turns on the counter and the timeline.",
      href: "/profile",
      done: Boolean(couple?.started_at),
    },
    {
      key: "memory",
      label: "Keep a memory",
      detail: "Something from before today, so this doesn't start empty.",
      href: "/memories/new",
      done: (memoryCount ?? 0) > 0,
    },
    {
      key: "date",
      label: "Plan something",
      detail: "Two real ideas for near you.",
      href: "/dates",
      done: (planCount ?? 0) > 0,
    },
  ];

  const spaces = [
    {
      href: "/dates",
      icon: Sparkles,
      title: "Date planner",
      detail:
        (planCount ?? 0) > 0
          ? `${planCount} saved`
          : "Two real ideas for tonight",
    },
    {
      href: "/memories",
      icon: Images,
      title: "Memory vault",
      detail:
        (memoryCount ?? 0) > 0 ? `${memoryCount} kept` : "Nothing kept yet",
    },
    {
      href: "/letters",
      icon: Mail,
      title: "Letters",
      detail:
        waitingForYou.length > 0
          ? `${waitingForYou.length} ready`
          : letters.length > 0
            ? `${letters.length} sealed`
            : "Write one for later",
    },
    {
      href: "/timeline",
      icon: InfinityIcon,
      title: "Timeline",
      detail:
        milestones.length > 0
          ? `${milestones.length} marked`
          : "Mark what mattered",
    },
  ];

  return (
    <Screen withNav className="mx-auto max-w-2xl">
      <header className="mt-space-lg mb-space-lg flex items-start justify-between gap-space-md">
        <div className="min-w-0">
          <p className="text-label-sm text-primary tracking-[0.3em]">
            OUR JOURNEY
          </p>
          <h1 className="mt-space-xs font-headline text-headline-lg text-on-surface text-balance">
            {greeting()}
            {session.displayName ? (
              <>
                , <em>{session.displayName}</em>
              </>
            ) : null}
          </h1>
          {partner?.displayName && (
            <p className="mt-space-xs text-body-sm text-on-surface-variant">
              Shared with {partner.displayName}
            </p>
          )}
        </div>

        <Link
          href="/profile"
          className="shrink-0 text-body-sm text-on-surface-variant transition hover:text-on-surface"
        >
          Profile
        </Link>
      </header>

      <FirstSteps steps={steps} />

      {/* Something waiting beats anything else on the screen. */}
      {waitingForYou.length > 0 && (
        <Card
          as={Link}
          href={`/letters/${waitingForYou[0].id}`}
          elevation="raised"
          interactive
          className="mb-space-lg block p-space-lg"
        >
          <Pill tone="primary" dot className="mb-space-sm">
            Ready to open
          </Pill>
          <h2 className="font-headline text-headline-sm text-on-surface">
            {waitingForYou[0].title}
          </h2>
          <p className="mt-space-xs text-body-sm text-on-surface-variant">
            From {partner?.displayName ?? "them"}
            {waitingForYou.length > 1 &&
              ` · ${waitingForYou.length - 1} more waiting`}
          </p>
        </Card>
      )}

      <ChapterCard
        startedAt={couple?.started_at ?? null}
        coupleName={couple?.name ?? null}
      />

      {nextMilestone && (
        <Card elevation="flat" className="mb-space-lg p-space-lg">
          <div className="flex items-center justify-between gap-space-md">
            <div className="min-w-0">
              <p className="mb-space-xs text-label-sm text-tertiary tracking-[0.2em]">
                COMING UP
              </p>
              <p className="font-headline text-headline-sm text-on-surface">
                {nextMilestone.icon && (
                  <span aria-hidden>{nextMilestone.icon} </span>
                )}
                {nextMilestone.title}
              </p>
            </div>

            {nextMilestone.daysAway !== null && (
              <Pill tone="tertiary">
                {describeUpcoming(nextMilestone.daysAway)}
              </Pill>
            )}
          </div>
        </Card>
      )}

      <Section title="Journey spaces">
        <div className="grid grid-cols-2 gap-space-sm">
          {spaces.map((space) => (
            <Card
              key={space.href}
              as={Link}
              href={space.href}
              elevation="flat"
              interactive
              className="block p-space-lg transition hover:border-primary/50"
            >
              <space.icon
                className="mb-space-sm h-6 w-6 text-primary"
                aria-hidden
              />
              <p className="text-title-md text-on-surface">{space.title}</p>
              <p className="mt-0.5 text-body-sm text-on-surface-variant">
                {space.detail}
              </p>
            </Card>
          ))}
        </div>
      </Section>

      {memories.length > 0 && (
        <Section
          title="Recent keepsakes"
          action={
            <Link
              href="/memories"
              className="flex items-center gap-1 text-body-sm text-primary transition hover:text-primary-container"
            >
              View all
              <ChevronRight size={14} aria-hidden />
            </Link>
          }
        >
          <ul className="grid grid-cols-2 gap-space-sm">
            {memories.slice(0, 4).map((memory) => {
              const cover = memory.memory_media?.find(
                (m) => m.media_type === "image"
              )?.storage_path;
              const url = cover ? signed[cover] : undefined;

              return (
                <li key={memory.id}>
                  <Card
                    as={Link}
                    href={`/memories/${memory.id}`}
                    elevation="flat"
                    className="block overflow-hidden p-0 transition hover:border-primary/50"
                  >
                    <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-surface-container-lowest">
                      {url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={url}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <CalendarDays
                          className="h-6 w-6 text-on-surface-variant/25"
                          aria-hidden
                        />
                      )}
                    </div>

                    <div className="p-space-md">
                      <p className="line-clamp-1 text-body-md text-on-surface">
                        {memory.title}
                      </p>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </Screen>
  );
}
