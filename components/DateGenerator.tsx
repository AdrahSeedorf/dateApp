"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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

type Props = {
  coupleId: string;
};

type Phase = "form" | "loading" | "result" | "error";

const LOCATION_KEY = "hidden-truths-date-location";

export default function DateGenerator({ coupleId }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [phase, setPhase] = useState<Phase>("form");
  const [mood, setMood] = useState("");
  const [budget, setBudget] = useState("");
  const [setting, setSetting] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");

  const [options, setOptions] = useState<DateIdea[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [savedIndexes, setSavedIndexes] = useState<boolean[]>([]);
  const [accessWarning, setAccessWarning] = useState(false);

  // Restoring the last-used location has to happen after mount: localStorage
  // doesn't exist during SSR, and seeding it into useState directly would
  // make the server and client render different markup.
  useEffect(() => {
    const stored = localStorage.getItem(LOCATION_KEY);

    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocation(stored);
    }
  }, []);

  const canGenerate = mood && budget && setting && time && location.trim();

  async function generate() {
    if (!canGenerate) return;

    setPhase("loading");
    setSavedIndexes([]);
    localStorage.setItem(LOCATION_KEY, location.trim());

    const result = await generateDateIdeas({
      mood,
      budget,
      setting,
      time,
      location: location.trim(),
      note: note.trim(),
    });

    if (!result.ok) {
      setErrorMessage(result.error);
      setPhase("error");
      return;
    }

    setOptions(result.options);
    setSavedIndexes(new Array(result.options.length).fill(false));
    setAccessWarning(result.accessWarning);
    setPhase("result");
  }

  async function savePlan(index: number) {
    const option = options[index];
    if (!option) return;

    const { error } = await supabase.from("date_plans").insert({
      couple_id: coupleId,
      title: option.title,
      activity: option.activity,
      location_type: option.locationType,
      budget_estimate: option.budgetEstimate,
      outfit_note: option.outfitNote,
      vibe_note: option.vibeNote,
    });

    if (error) {
      console.error("[dates] save failed", error.message);
      setErrorMessage(`Couldn't save that: ${error.message}`);
      return;
    }

    setSavedIndexes((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });

    // Saved plans render on the server, so refresh to pick this one up.
    router.refresh();
  }

  return (
    <>
      {phase === "form" && (
        <div className="rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-8">
          <div className="mb-6">
            <label
              htmlFor="location"
              className="block text-white/50 text-sm mb-3 tracking-[0.15em]"
            >
              LOCATION
            </label>

            <input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Penrith, NSW"
              className="w-full px-5 py-3 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30"
            />

            <p className="text-white/30 text-xs mt-2">
              So it can name real places near you, not generic ones.
            </p>
          </div>

          <PillGroup label="Mood" options={MOODS} value={mood} onChange={setMood} />
          <PillGroup label="Budget" options={BUDGETS} value={budget} onChange={setBudget} />
          <PillGroup label="Setting" options={SETTINGS} value={setting} onChange={setSetting} />
          <PillGroup label="Time available" options={TIMES} value={time} onChange={setTime} />

          <div className="mb-6">
            <label
              htmlFor="note"
              className="block text-white/50 text-sm mb-3 tracking-[0.15em]"
            >
              ANYTHING IN MIND? (OPTIONAL)
            </label>

            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. she's had a stressful week, keep it low-key"
              className="w-full px-5 py-3 rounded-2xl border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30 resize-none"
            />

            <p className="text-white/30 text-xs mt-2">
              This is where it gets specific.
            </p>
          </div>

          <button
            onClick={generate}
            disabled={!canGenerate}
            className="w-full px-6 py-4 rounded-full bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-white/40 transition font-semibold"
          >
            Generate date ideas
          </button>
        </div>
      )}

      {phase === "loading" && (
        <div className="rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-16 text-center">
          <div className="text-4xl mb-5 animate-pulse">✦</div>
          <p className="text-white/60">
            Thinking of something worth the drive...
          </p>
        </div>
      )}

      {phase === "error" && (
        <div className="rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-8 text-center">
          <p className="text-pink-200 mb-6 break-words">{errorMessage}</p>
          <button
            onClick={() => setPhase("form")}
            className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            Try again
          </button>
        </div>
      )}

      {phase === "result" && options.length > 0 && (
        <div>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {options.map((option, index) => (
              <DateOptionCard
                key={index}
                option={option}
                index={index}
                action={
                  <button
                    onClick={() => savePlan(index)}
                    disabled={savedIndexes[index]}
                    className="w-full px-5 py-3 rounded-full bg-pink-500 hover:bg-pink-400 disabled:bg-emerald-500/30 disabled:text-emerald-100 transition text-sm font-semibold"
                  >
                    {savedIndexes[index] ? "Saved ✓" : "Save this one"}
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

          {errorMessage && (
            <p className="text-pink-200 text-sm mb-4">{errorMessage}</p>
          )}

          <p className="text-white/30 text-xs mb-6">
            Named places are AI best guesses — worth checking they&apos;re
            still open before you go.
          </p>

          <button
            onClick={generate}
            className="w-full px-6 py-4 rounded-full bg-white/10 hover:bg-white/20 transition"
          >
            Generate another pair
          </button>
        </div>
      )}
    </>
  );
}
