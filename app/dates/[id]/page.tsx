import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Clock,
  Images,
  MapPin,
  Play,
  Shirt,
  Sparkles,
  Trash2,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { getPartner } from "@/lib/couple";
import {
  canStart,
  canStartNow,
  daysUntil,
  describeCountdown,
  formatTime,
  getPlan,
  isOverdue,
} from "@/lib/datePlans";
import { attributionIsMeaningful, credit, possessive } from "@/lib/attribution";
import PlanForm from "@/components/dates/PlanForm";
import CancelDate from "@/components/dates/CancelDate";
import { deletePlan, startDate } from "../actions";
import { Button, Card, Pill, Screen, Section } from "@/components/ui";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ planned?: string }>;
};

function formatDay(value: string | null) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default async function DatePlanPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { planned } = await searchParams;

  const session = await requireOnboarded();
  const supabase = await createClient();

  const plan = await getPlan(supabase, id);

  // RLS means another couple's plan simply isn't there.
  if (!plan) notFound();

  const partner = await getPartner(supabase, session.userId, session.coupleId);
  const partnerName = partner?.displayName ?? "Them";

  const viewer = {
    userId: session.userId,
    partnerId: partner?.id ?? null,
    partnerName: partner?.displayName ?? null,
  };

  // Alone in the couple, every row is yours, and saying so on each one is
  // noise rather than information.
  const showWho = attributionIsMeaningful(viewer);
  const whoseIdea = showWho ? possessive(plan.created_by, viewer) : null;
  const whoPlanned = showWho ? credit(plan.planned_by, "put this in the diary", viewer) : null;
  const whoCancelled = showWho ? credit(plan.cancelled_by, "called this off", viewer) : null;

  const days = daysUntil(plan);
  const startable = canStart(plan);
  const overdue = isOverdue(plan);

  // Computed here so the form never reads the clock during render.
  const today = new Date().toISOString().slice(0, 10);

  const stats = [
    plan.location_type && { icon: MapPin, label: "WHERE", value: plan.location_type },
    plan.budget_estimate && { icon: Wallet, label: "BUDGET", value: plan.budget_estimate },
    plan.outfit_note && { icon: Shirt, label: "WEAR", value: plan.outfit_note },
    plan.vibe_note && { icon: Sparkles, label: "WHY IT FITS", value: plan.vibe_note },
  ].filter(Boolean) as { icon: typeof MapPin; label: string; value: string }[];

  return (
    <Screen className="mx-auto max-w-2xl">
      <Link
        href="/dates"
        className="mt-space-lg inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
      >
        ← Plan a date
      </Link>

      <header className="mb-space-lg mt-space-lg">
        <div className="mb-space-sm flex flex-wrap items-center gap-space-sm">
          {plan.status === "planned" && days !== null && (
            <Pill tone={overdue ? "tertiary" : "primary"} dot={days === 0}>
              {describeCountdown(days)}
            </Pill>
          )}
          {plan.status === "live" && <Pill tone="primary" dot>Happening now</Pill>}
          {plan.status === "done" && <Pill>Done</Pill>}
          {plan.status === "cancelled" && <Pill>Called off</Pill>}
          {plan.reschedule_count > 0 && plan.status === "planned" && (
            <Pill>
              Moved {plan.reschedule_count === 1 ? "once" : `${plan.reschedule_count} times`}
            </Pill>
          )}
        </div>

        <h1 className="font-headline text-headline-lg text-on-surface text-balance">
          {plan.title}
        </h1>

        {plan.scheduled_for && plan.status !== "saved" && (
          <p className="mt-space-xs flex flex-wrap items-center gap-x-space-md gap-y-1 text-body-sm text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              {formatDay(plan.scheduled_for)}
            </span>
            {plan.scheduled_time && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {formatTime(plan.scheduled_time)}
              </span>
            )}
          </p>
        )}

        {/* Quiet by design: useful when you're wondering, invisible when
            you're not. Both lines disappear entirely on older plans, which
            have no attribution to show. */}
        {(whoseIdea || whoPlanned) && (
          <p className="mt-space-sm text-label-sm text-on-surface-variant">
            {whoseIdea && <span>{whoseIdea} idea</span>}
            {whoseIdea && whoPlanned && <span aria-hidden> · </span>}
            {whoPlanned}
          </p>
        )}
      </header>

      {planned && (
        <Card elevation="raised" className="mb-space-lg p-space-lg">
          <p role="status" className="text-body-md text-on-surface">
            In the diary. {partnerName} sees it too, and it&apos;ll count down
            on your home screen.
          </p>
        </Card>
      )}

      {plan.activity && (
        <Card className="mb-space-lg p-space-lg">
          <p className="text-body-lg text-on-surface/90 leading-relaxed">
            {plan.activity}
          </p>
        </Card>
      )}

      {stats.length > 0 && (
        <div className="mb-space-lg grid gap-space-sm sm:grid-cols-2">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg bg-surface-container p-space-md">
              <div className="mb-space-xs flex items-center gap-2">
                <stat.icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                <p className="text-label-sm text-on-surface-variant tracking-[0.2em]">
                  {stat.label}
                </p>
              </div>
              <p className="text-body-md text-on-surface">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* The start button outranks everything once the day arrives. */}
      {startable && (
        <Card elevation="raised" className="mb-space-lg p-space-lg text-center">
          <h2 className="mb-space-xs font-headline text-headline-sm text-on-surface">
            {overdue ? "Did this happen?" : "Ready when you are"}
          </h2>
          <p className="mx-auto mb-space-lg max-w-sm text-body-md text-on-surface-variant leading-relaxed">
            {overdue
              ? "Start it anyway and you can still keep the photos and notes from the night."
              : "Starting it lets you drop photos and notes as you go, and turns them into a memory afterwards."}
          </p>

          <form action={startDate}>
            <input type="hidden" name="id" value={plan.id} />
            <Button type="submit" fullWidth>
              <Play className="h-4 w-4" aria-hidden />
              Start the date
            </Button>
          </form>
        </Card>
      )}

      {plan.status === "live" && (
        <Card elevation="raised" className="mb-space-lg p-space-lg text-center">
          <p className="mb-space-md text-body-md text-on-surface">
            This one&apos;s running.
          </p>
          <Button href={`/dates/${plan.id}/live`} fullWidth>
            Back to the date
          </Button>
        </Card>
      )}

      {plan.status === "done" && (
        <Card className="mb-space-lg p-space-lg text-center">
          {plan.memory_id ? (
            <>
              <p className="mb-space-md text-body-md text-on-surface-variant">
                This one&apos;s in the vault.
              </p>
              <Button href={`/memories/${plan.memory_id}`} variant="secondary">
                <Images className="h-4 w-4" aria-hidden />
                See the memory
              </Button>
            </>
          ) : (
            <>
              <p className="mb-space-md text-body-md text-on-surface-variant">
                It happened — but it hasn&apos;t been written up yet.
              </p>
              <Button href={`/dates/${plan.id}/wrap`}>Write it up</Button>
            </>
          )}
        </Card>
      )}

      {/* Shows for any cancellation now, not just ones with a reason typed.
          A date that silently reverts to "Called off" with nothing beside it
          is the kind of thing you end up asking your partner about. */}
      {plan.status === "cancelled" && (plan.cancel_reason || whoCancelled) && (
        <Card elevation="flat" className="mb-space-lg p-space-lg">
          <p className="text-body-sm text-on-surface-variant">
            {whoCancelled ?? "Called off"}
            {plan.cancel_reason && ` — ${plan.cancel_reason}`}
          </p>
        </Card>
      )}

      {/* Spontaneity needs a door. Without this, "we're doing this tonight"
          means filling in a date picker for today first. */}
      {canStartNow(plan) && (
        <Card elevation="flat" className="mb-space-lg p-space-lg">
          <div className="flex flex-wrap items-center justify-between gap-space-md">
            <p className="text-body-md text-on-surface-variant">
              Doing this right now?
            </p>

            <form action={startDate}>
              <input type="hidden" name="id" value={plan.id} />
              <Button type="submit" size="sm" variant="secondary">
                <Play className="h-4 w-4" aria-hidden />
                Start it now
              </Button>
            </form>
          </div>
        </Card>
      )}

      {/* Planning stays available on anything that hasn't happened, which is
          what makes rescheduling and un-cancelling the same action. */}
      {(plan.status === "saved" ||
        plan.status === "planned" ||
        plan.status === "cancelled") && (
        <Section
          title={plan.status === "saved" ? "Plan it" : "The plan"}
          className="mb-space-lg"
        >
          <PlanForm plan={plan} partnerName={partnerName} today={today} />
        </Section>
      )}

      {plan.status === "planned" && (
        <div className="mb-space-lg">
          <CancelDate planId={plan.id} />
        </div>
      )}

      {/* Only an unscheduled idea can be thrown away outright. Anything that
          was in the diary gets cancelled instead, so the history survives. */}
      {plan.status === "saved" && (
        <form action={deletePlan} className="mt-space-xl border-t border-[var(--glass-rim)] pt-space-lg">
          <input type="hidden" name="id" value={plan.id} />
          <button
            type="submit"
            className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant transition hover:text-error"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Remove this idea
          </button>
        </form>
      )}
    </Screen>
  );
}
