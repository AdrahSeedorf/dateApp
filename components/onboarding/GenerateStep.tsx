"use client";

import { useState, useTransition } from "react";
import PillGroup from "@/components/dates/PillGroup";
import DateOptionCard from "@/components/dates/DateOptionCard";
import {
  BUDGETS,
  generateDateIdeas,
  MOODS,
  SETTINGS,
  TIMES,
  type DateIdea,
} from "@/lib/dateIdeas";
import { saveFirstPlan } from "@/app/welcome/actions";

type Props = {
  location: string;
  onDone: () => Promise<void>;
};

/**
 * The value moment: two real ideas before anything else is asked.
 *
 * Location comes from the previous step rather than being asked again, and
 * saving is optional — the point is that they see it work, not that they
 * commit to anything.
 */
export default function GenerateStep({ location, onDone }: Props) {
  const [mood, setMood] = useState("");
  const [budget, setBudget] = useState("");
  const [setting, setSetting] = useState("");
  const [time, setTime] = useState("");

  const [options, setOptions] = useState<DateIdea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedIndex, setSavedIndex] = useState<number | null>(null);
  const [accessWarning, setAccessWarning] = useState(false);
  const [pending, startTransition] = useTransition();

  const ready = mood && budget && setting && time;

  async function generate() {
    if (!ready) return;

    setLoading(true);
    setError("");
    setSavedIndex(null);

    const result = await generateDateIdeas({
      mood,
      budget,
      setting,
      time,
      location,
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setOptions(result.options);
    setAccessWarning(result.accessWarning);
  }

  function save(index: number) {
    const option = options[index];
    if (!option) return;

    startTransition(async () => {
      const result = await saveFirstPlan(option);

      if (result.error) {
        setError(result.error);
        return;
      }

      setSavedIndex(index);
    });
  }

  function finish() {
    startTransition(async () => {
      await onDone();
    });
  }

  if (options.length > 0) {
    return (
      <div>
        <div className="space-y-5 mb-6">
          {options.map((option, index) => (
            <DateOptionCard
              key={index}
              option={option}
              index={index}
              action={
                <button
                  onClick={() => save(index)}
                  disabled={pending || savedIndex !== null}
                  className="w-full px-5 py-3 rounded-full bg-pink-500 hover:bg-pink-400 disabled:bg-emerald-500/30 disabled:text-emerald-100 transition text-sm font-semibold"
                >
                  {savedIndex === index ? "Saved ✓" : "Save this one"}
                </button>
              }
            />
          ))}
        </div>

        {accessWarning && (
          <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4 mb-5">
            <p className="text-amber-100 text-sm leading-relaxed">
              These didn&apos;t clearly account for everything you said a
              date needs to work around. Check them carefully, or generate
              another pair.
            </p>
          </div>
        )}

        {error && <p className="text-pink-200 text-sm mb-4">{error}</p>}

        <p className="text-white/30 text-xs mb-6">
          Named places are AI best guesses — worth checking they&apos;re open
          before you go.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={generate}
            disabled={loading || pending}
            className="flex-1 px-6 py-4 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 transition"
          >
            {loading ? "Thinking..." : "Try two more"}
          </button>

          <button
            onClick={finish}
            disabled={pending}
            className="flex-1 px-6 py-4 rounded-full bg-pink-500 hover:bg-pink-400 disabled:opacity-50 transition font-semibold"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PillGroup label="Mood" options={MOODS} value={mood} onChange={setMood} />
      <PillGroup label="Budget" options={BUDGETS} value={budget} onChange={setBudget} />
      <PillGroup label="Setting" options={SETTINGS} value={setting} onChange={setSetting} />
      <PillGroup label="Time available" options={TIMES} value={time} onChange={setTime} />

      {error && <p className="text-pink-200 text-sm mb-4">{error}</p>}

      <button
        onClick={generate}
        disabled={!ready || loading}
        className="w-full px-6 py-4 rounded-full bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-white/40 transition font-semibold"
      >
        {loading ? "Thinking of something..." : "Show me two ideas"}
      </button>

      <button
        onClick={finish}
        disabled={pending}
        className="w-full mt-3 px-6 py-3 rounded-full text-white/40 hover:text-white/70 transition text-sm"
      >
        I&apos;ll do this later
      </button>
    </div>
  );
}
