import Link from "next/link";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import {
  canStart,
  daysUntil,
  describeCountdown,
  formatTime,
  isOverdue,
  type DatePlan,
} from "@/lib/datePlans";
import { Card, Pill, cn } from "@/components/ui";

/**
 * A plan in a list.
 *
 * The status pill does the work — at a glance you should know whether this
 * is an idea, something in the diary, tonight, or a thing that already
 * happened and is still waiting to be written up.
 */
export default function PlanCard({ plan }: { plan: DatePlan }) {
  const days = daysUntil(plan);
  const overdue = isOverdue(plan);
  const startable = canStart(plan);

  return (
    <Card
      as={Link}
      href={`/dates/${plan.id}`}
      elevation={plan.status === "live" || startable ? "raised" : "flat"}
      interactive
      className={cn(
        "block p-space-lg transition hover:border-primary/50",
        (plan.status === "live" || startable) && "border-primary/40"
      )}
    >
      <div className="mb-space-xs flex flex-wrap items-center gap-space-sm">
        {plan.status === "live" && <Pill tone="primary" dot>Happening now</Pill>}

        {plan.status === "planned" && days !== null && (
          <Pill tone={overdue ? "tertiary" : "primary"} dot={days === 0}>
            {describeCountdown(days)}
          </Pill>
        )}

        {plan.status === "done" && !plan.memory_id && (
          <Pill tone="tertiary">Needs writing up</Pill>
        )}

        {plan.status === "cancelled" && <Pill>Called off</Pill>}
      </div>

      <p className="text-title-md text-on-surface">{plan.title}</p>

      {plan.status === "planned" && plan.scheduled_for && (
        <p className="mt-space-xs flex flex-wrap items-center gap-x-space-md gap-y-1 text-label-sm text-on-surface-variant">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3 w-3" aria-hidden />
            {new Date(plan.scheduled_for + "T00:00:00").toLocaleDateString(
              undefined,
              { weekday: "short", day: "numeric", month: "short" }
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

      {plan.location_type && plan.status !== "planned" && (
        <p className="mt-space-xs flex items-center gap-1.5 text-body-sm text-on-surface-variant">
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          <span className="line-clamp-1">{plan.location_type}</span>
        </p>
      )}

      {plan.activity && plan.status === "saved" && (
        <p className="mt-space-sm line-clamp-2 text-body-sm text-on-surface-variant leading-relaxed">
          {plan.activity}
        </p>
      )}
    </Card>
  );
}
