"use client";

import { ReactNode } from "react";
import { Calendar, MapPin, Wallet, Shirt, Sparkles } from "lucide-react";
import type { DateIdea } from "@/lib/dateIdeas";

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

      {action}
    </div>
  );
}
