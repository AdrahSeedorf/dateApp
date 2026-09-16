import Link from "next/link";
import { CalendarDays, Clock, Play } from "lucide-react";
import {
  canStart,
  daysUntil,
  describeCountdown,
  formatTime,
  isOverdue,
  type DatePlan,
  type Role,
} from "@/lib/datePlans";
import { startDate } from "@/app/dates/actions";
import { Button, Card, Pill } from "@/components/ui";

type Props = {
  plan: DatePlan;
  partnerName: string;
  elapsed: string | null;
};

function whoLabel(role: Role, partnerName: string) {
  if (role.who === "you") return "You";
  if (role.who === "them") return partnerName;
  return "Both";
}

/**
 * The date, on the home screen.
 *
 * Four different cards depending on where the date is, because the only
 * useful thing to show changes completely: a countdown before, a start
 * button on the day, a way back in while it's running, and a prompt to write
 * it up afterwards.
 */
export default function NextDateCard({ plan, partnerName, elapsed }: Props) {
  const days = daysUntil(plan);
  const startable = canStart(plan);
  const overdue = isOverdue(plan);

  // Running: the only thing worth offering is the way back in.
  if (plan.status === "live") {
    return (
      <Card
        as={Link}
        href={`/dates/${plan.id}/live`}
        elevation="raised"
        interactive
        className="mb-space-lg block border-primary/40 p-space-lg"
      >
        <Pill tone="primary" dot className="mb-space-sm">
          On a date{elapsed ? ` · ${elapsed}` : ""}
        </Pill>

        <h2 className="font-headline text-headline-sm text-on-surface">
          {plan.title}
        </h2>

        <p className="mt-space-xs text-body-sm text-on-surface-variant">
          Tap to keep a photo or a note.
        </p>
      </Card>
    );
  }

  // Finished but unwritten. Kept insistent rather than polite — this is the
  // step that decides whether the vault ever fills up.
  if (plan.status === "done" && !plan.memory_id) {
    return (
      <Card elevation="raised" className="mb-space-lg p-space-lg">
        <Pill tone="tertiary" className="mb-space-sm">
          How was it?
        </Pill>

        <h2 className="mb-space-sm font-headline text-headline-sm text-on-surface">
          {plan.title}
        </h2>

        <Button href={`/dates/${plan.id}/wrap`} size="sm" fullWidth>
          Write it up
        </Button>
      </Card>
    );
  }

  if (plan.status !== "planned") return null;

  return (
    <Card
      elevation={startable ? "raised" : "flat"}
      className={`mb-space-lg p-space-lg ${startable ? "border-primary/40" : ""}`}
    >
      <div className="mb-space-sm flex flex-wrap items-center gap-space-sm">
        <Pill tone={overdue ? "tertiary" : "primary"} dot={days === 0}>
          {overdue ? "Did this happen?" : describeCountdown(days)}
        </Pill>
      </div>

      <Link href={`/dates/${plan.id}`} className="block">
        <h2 className="font-headline text-headline-sm text-on-surface">
          {plan.title}
        </h2>

        {plan.scheduled_for && (
          <p className="mt-space-xs flex flex-wrap items-center gap-x-space-md gap-y-1 text-label-sm text-on-surface-variant">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3" aria-hidden />
              {new Date(plan.scheduled_for + "T00:00:00").toLocaleDateString(
                undefined,
                { weekday: "long", day: "numeric", month: "long" }
              )}
            </span>

            {plan.scheduled_time && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" aria-hidden />
                {formatTime(plan.scheduled_time)}
              </span>
            )}
          </p>
        )}
      </Link>

      {/* Roles show only close to the day — a week out they're noise, and on
          the night they're the thing you actually want to check. */}
      {plan.roles.length > 0 && days !== null && days <= 1 && (
        <ul className="mt-space-md space-y-1 border-t border-[var(--glass-rim)] pt-space-md">
          {plan.roles.map((role) => (
            <li
              key={role.label}
              className="flex justify-between gap-space-md text-body-sm"
            >
              <span className="text-on-surface-variant">{role.label}</span>
              <span className="text-on-surface">
                {whoLabel(role, partnerName)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {startable && (
        <form action={startDate} className="mt-space-md">
          <input type="hidden" name="id" value={plan.id} />
          <Button type="submit" fullWidth>
            <Play className="h-4 w-4" aria-hidden />
            Start the date
          </Button>
        </form>
      )}
    </Card>
  );
}
