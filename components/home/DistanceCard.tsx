import Link from "next/link";
import { Plane } from "lucide-react";
import { Card, Pill } from "@/components/ui";

type Props = {
  partnerName: string;
  /** Formatted on the server so no clock is read during render. */
  yourTime: string | null;
  theirTime: string | null;
  dayNote: string | null;
  reunionLabel: string | null;
};

/**
 * Two clocks and a countdown.
 *
 * This is what replaces the heartbeat sync and haptic bracelets from the
 * Stitch designs. It carries the same feeling — the other person is real,
 * somewhere else, right now — using two things the browser already knows and
 * one date the couple typed in. No hardware, no location tracking, no
 * always-on stream.
 */
export default function DistanceCard({
  partnerName,
  yourTime,
  theirTime,
  dayNote,
  reunionLabel,
}: Props) {
  // With neither a clock nor a date there's nothing to say, and an empty
  // card announcing the distance would be a small cruelty.
  if (!theirTime && !reunionLabel) return null;

  return (
    <Card elevation="flat" className="mb-space-lg p-space-lg">
      <div className="flex items-center justify-between gap-space-md">
        {theirTime && (
          <div className="min-w-0">
            <p className="mb-space-xs text-label-sm text-on-surface-variant tracking-[0.2em]">
              WHERE THEY ARE
            </p>

            <p className="font-headline text-headline-sm text-on-surface">
              {theirTime}
              <span className="text-body-md text-on-surface-variant">
                {" "}
                for {partnerName}
              </span>
            </p>

            <p className="mt-0.5 text-label-sm text-on-surface-variant">
              {yourTime && <>{yourTime} here</>}
              {yourTime && dayNote && " · "}
              {dayNote}
            </p>
          </div>
        )}

        {reunionLabel && (
          <Link
            href="/profile"
            className="shrink-0 text-right transition hover:opacity-80"
          >
            <Pill tone="tertiary" className="mb-space-xs">
              <Plane className="h-3 w-3" aria-hidden />
              Together again
            </Pill>
            <p className="font-headline text-headline-sm text-tertiary">
              {reunionLabel}
            </p>
          </Link>
        )}
      </div>
    </Card>
  );
}
