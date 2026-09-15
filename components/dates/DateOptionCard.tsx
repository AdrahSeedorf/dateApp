"use client";

import { ReactNode } from "react";
import {
  Accessibility,
  Calendar,
  Info,
  MapPin,
  Shirt,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { DateIdea } from "@/lib/dateIdeas";
import { ACCESS_NEEDS } from "@/lib/accessNeeds";
import { Card, Pill } from "@/components/ui";

function StatBlock({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-surface-container p-space-md">
      <div className="mb-space-xs flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
        <p className="text-label-sm text-on-surface-variant tracking-[0.2em]">
          {label}
        </p>
      </div>
      <p className="text-body-md text-on-surface">{value}</p>
    </div>
  );
}

type Props = {
  option: DateIdea;
  index: number;
  /** Buttons vary by context — saving during onboarding, sharing later. */
  action?: ReactNode;
};

export default function DateOptionCard({ option, index, action }: Props) {
  // Only needs the server decided this viewer may see reach the client.
  const accessNotes = ACCESS_NEEDS.flatMap((need) => {
    const detail = option.accessibility?.[need.key];
    return detail?.trim() ? [{ label: need.label, detail }] : [];
  });

  return (
    <Card elevation="raised" className="p-space-xl">
      <div className="mb-space-md flex items-center gap-space-sm">
        <span className="rounded-full bg-[rgb(var(--c-glow-a)/0.18)] p-1.5">
          <Calendar className="h-3.5 w-3.5 text-primary" aria-hidden />
        </span>
        <p className="text-label-sm text-primary tracking-[0.3em]">
          OPTION {index + 1}
        </p>
      </div>

      <h3 className="font-headline text-headline-sm text-on-surface mb-space-sm">
        {option.title}
      </h3>

      <p className="text-body-md text-on-surface-variant leading-relaxed mb-space-lg">
        {option.activity}
      </p>

      <div className="mb-space-lg grid gap-space-sm sm:grid-cols-2">
        <StatBlock icon={MapPin} label="WHERE" value={option.locationType} />
        <StatBlock icon={Wallet} label="BUDGET" value={option.budgetEstimate} />
        <StatBlock icon={Shirt} label="WEAR" value={option.outfitNote} />
        <StatBlock icon={Sparkles} label="WHY IT FITS" value={option.vibeNote} />
      </div>

      {accessNotes.length > 0 && (
        // Tertiary (champagne) rather than a green "success" colour: this is
        // information about how the plan fits, not a validation pass.
        <div className="mb-space-lg rounded-lg border border-tertiary/25 bg-[rgb(var(--c-glow-c)/0.08)] p-space-md">
          <div className="mb-space-sm flex items-center gap-2">
            <Accessibility className="h-3.5 w-3.5 text-tertiary" aria-hidden />
            <p className="text-label-sm text-tertiary tracking-[0.2em]">
              WHY THIS WORKS FOR YOU
            </p>
          </div>

          <ul className="space-y-space-xs">
            {accessNotes.map(({ label, detail }) => (
              <li
                key={label}
                className="text-body-md text-on-surface-variant leading-relaxed"
              >
                <span className="text-tertiary">{label}:</span> {detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {action}
    </Card>
  );
}

/**
 * Standing caveat on every generated plan.
 *
 * Named venues come from a language model, which will occasionally invent one
 * or name somewhere that closed. Until generation is grounded against a
 * places API, this says so plainly rather than letting the confident layout
 * imply the details were checked.
 *
 * The Stitch design showed "Booked ✓ — quiet booth confirmed" on itinerary
 * cards. Nothing here can book anything, and a plan that reads as confirmed
 * when it isn't sends two people to a restaurant with no table on their
 * anniversary. The model is instructed not to imply it; this says the quiet
 * part out loud.
 */
export function GeneratedCaveat() {
  return (
    <div className="flex items-start gap-space-sm rounded-lg border border-[var(--glass-rim)] bg-[var(--glass-1)] p-space-md">
      <Info
        className="mt-0.5 h-4 w-4 shrink-0 text-on-surface-variant"
        aria-hidden
      />
      <p className="text-body-sm text-on-surface-variant leading-relaxed">
        Places are suggestions, not bookings — nothing here is reserved. Worth
        checking they&apos;re open, and calling ahead if it&apos;s somewhere
        that fills up.
      </p>
    </div>
  );
}

export function AccessWarning() {
  return (
    <div
      role="alert"
      className="rounded-lg border border-tertiary/30 bg-[rgb(var(--c-glow-c)/0.1)] p-space-md"
    >
      <Pill tone="tertiary" className="mb-space-xs">
        Check these
      </Pill>
      <p className="text-body-md text-on-surface-variant leading-relaxed">
        These didn&apos;t clearly account for everything you said a date needs
        to work around. Check them carefully, or generate another pair.
      </p>
    </div>
  );
}
