import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { Card, ProgressRail, cn } from "@/components/ui";

export type Step = {
  key: string;
  label: string;
  detail: string;
  href: string;
  done: boolean;
};

/**
 * What the dashboard is on day one.
 *
 * Every mockup of this app was drawn at 1,238 days and 142 keepsakes. The
 * real first user opens it with no partner, no memories, no dates and an
 * empty ring — and that is the screen that decides whether they come back.
 *
 * So day one gets its own design rather than a degraded version of the full
 * one: a short list of things that are actually worth doing, in the order
 * that makes the rest of the app work. It disappears on its own once the
 * last box is ticked, so nobody has to dismiss it.
 */
export default function FirstSteps({ steps }: { steps: Step[] }) {
  const done = steps.filter((s) => s.done).length;

  if (done === steps.length) return null;

  return (
    <Card className="mb-space-lg p-space-lg">
      <div className="mb-space-md flex items-baseline justify-between gap-space-md">
        <h2 className="font-headline text-headline-sm text-on-surface">
          Getting set up
        </h2>
        <p className="text-label-sm text-on-surface-variant">
          {done} of {steps.length}
        </p>
      </div>

      <ProgressRail
        value={done / steps.length}
        label={`Setup progress: ${done} of ${steps.length} done`}
        className="mb-space-lg"
      />

      <ul className="space-y-space-xs">
        {steps.map((step) => (
          <li key={step.key}>
            {step.done ? (
              // Completed steps stay visible but stop being targets — the
              // list is a record of progress, not just a queue.
              <div className="flex items-center gap-space-sm rounded-lg p-space-sm">
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tertiary text-on-tertiary"
                >
                  <Check size={14} />
                </span>
                <span className="text-body-md text-on-surface-variant line-through">
                  {step.label}
                </span>
              </div>
            ) : (
              <Link
                href={step.href}
                className={cn(
                  "flex items-center gap-space-sm rounded-lg p-space-sm transition",
                  "hover:bg-[var(--glass-2)]"
                )}
              >
                <span
                  aria-hidden
                  className="h-6 w-6 shrink-0 rounded-full border border-[var(--glass-rim-strong)]"
                />

                <span className="min-w-0 flex-1">
                  <span className="block text-body-md text-on-surface">
                    {step.label}
                  </span>
                  <span className="block text-body-sm text-on-surface-variant">
                    {step.detail}
                  </span>
                </span>

                <ChevronRight
                  size={16}
                  className="shrink-0 text-on-surface-variant"
                  aria-hidden
                />
              </Link>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
