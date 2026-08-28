"use client";

import { ReactNode } from "react";
import { Calendar, MapPin, Wallet, Shirt, Sparkles, Accessibility } from "lucide-react";
import type { DateIdea } from "@/lib/dateIdeas";
import { ACCESS_NEEDS } from "@/lib/accessNeeds";

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
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5 text-pink-300" aria-hidden />
        <p className="text-white/40 text-xs tracking-[0.2em]">{label}</p>
      </div>
      <p className="text-white/85 text-sm">{value}</p>
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
    <div className="rounded-3xl border border-pink-300/30 bg-pink-500/5 backdrop-blur-xl p-7">
      <div className="flex items-center gap-2 mb-4">
        <div className="rounded-full bg-pink-500/20 p-1.5">
          <Calendar className="w-3.5 h-3.5 text-pink-200" aria-hidden />
        </div>
        <p className="tracking-[0.3em] text-xs text-pink-200">
          OPTION {index + 1}
        </p>
      </div>

      <h3 className="text-xl font-bold mb-3">{option.title}</h3>

      <p className="text-white/70 text-sm leading-relaxed mb-6">
        {option.activity}
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <StatBlock icon={MapPin} label="WHERE" value={option.locationType} />
        <StatBlock icon={Wallet} label="BUDGET" value={option.budgetEstimate} />
        <StatBlock icon={Shirt} label="WEAR" value={option.outfitNote} />
        <StatBlock icon={Sparkles} label="WHY IT FITS" value={option.vibeNote} />
      </div>

      {accessNotes.length > 0 && (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/5 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Accessibility className="w-3.5 h-3.5 text-emerald-300" aria-hidden />
            <p className="text-emerald-200/80 text-xs tracking-[0.2em]">
              WHY THIS WORKS FOR YOU
            </p>
          </div>

          <ul className="space-y-2">
            {accessNotes.map(({ label, detail }) => (
              <li key={label} className="text-white/75 text-sm leading-relaxed">
                <span className="text-emerald-200/90">{label}:</span> {detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {action}
    </div>
  );
}
