import Link from "next/link";
import { anniversary, formatCount } from "@/lib/anniversary";
import { Card, Pill, ProgressRail } from "@/components/ui";

type Props = {
  startedAt: string | null;
  coupleName: string | null;
};

/**
 * "1,238 days · 42 to year five."
 *
 * Counts only, never a score. A number that grades a relationship will
 * eventually fall, and someone will watch it fall during a bad week —
 * days and keepsakes only ever go up, which is why they're safe to put on
 * the screen someone opens every morning.
 */
export default function ChapterCard({ startedAt, coupleName }: Props) {
  if (!startedAt) {
    return (
      <Card
        as={Link}
        href="/profile"
        elevation="flat"
        className="mb-space-lg block p-space-lg transition hover:border-primary/50"
      >
        <p className="text-label-sm text-tertiary tracking-[0.2em] mb-space-xs">
          OUR CHAPTER
        </p>
        <p className="text-body-md text-on-surface-variant">
          Set the day it started and the counter begins.
        </p>
      </Card>
    );
  }

  const a = anniversary(startedAt);

  return (
    <Card className="mb-space-lg p-space-lg">
      <div className="mb-space-md flex items-center justify-between gap-space-md">
        <p className="text-label-sm text-tertiary tracking-[0.2em]">
          {coupleName ? coupleName.toUpperCase() : "OUR CHAPTER"}
        </p>
        <Pill tone="tertiary">Year {a.currentYear}</Pill>
      </div>

      <p className="font-headline text-display-lg-mobile text-on-surface">
        {formatCount(a.daysTogether)}{" "}
        <span className="text-headline-sm text-primary">
          {a.daysTogether === 1 ? "day" : "days"}
        </span>
      </p>

      <p className="mt-space-xs text-body-md text-on-surface-variant">
        {a.daysUntilNext === 0
          ? `Year ${a.nextYear} — today.`
          : `${formatCount(a.daysUntilNext)} ${
              a.daysUntilNext === 1 ? "day" : "days"
            } to year ${a.nextYear}.`}
      </p>

      <ProgressRail
        value={a.progress}
        label={`${Math.round(a.progress * 100)}% through year ${a.currentYear}`}
        className="mt-space-md"
      />
    </Card>
  );
}
