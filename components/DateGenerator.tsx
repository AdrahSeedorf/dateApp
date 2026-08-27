"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Wallet, Shirt, Sparkles, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  coupleId: string;
};

type DateIdea = {
  title: string;
  activity: string;
  locationType: string;
  budgetEstimate: string;
  outfitNote: string;
  vibeNote: string;
};

type Phase = "form" | "loading" | "result" | "error";

const MOODS = ["Cozy", "Playful", "Romantic", "Adventurous"];
const BUDGETS = ["Low", "Medium", "High"];
const SETTINGS = ["Indoor", "Outdoor", "Either"];
const TIMES = ["A couple hours", "Half a day", "The whole day"];

const LOCATION_KEY = "hidden-truths-date-location";

function PillGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-6">
      <p className="text-white/50 text-sm mb-3 tracking-[0.15em]">
        {label.toUpperCase()}
      </p>

      <div className="flex flex-wrap gap-3">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`px-5 py-3 rounded-full border transition text-sm font-medium ${
              value === option
                ? "border-pink-300 bg-pink-500/20 text-pink-100"
                : "border-white/10 bg-white/5 hover:bg-white/10 text-white/70"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

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
        <Icon className="w-3.5 h-3.5 text-pink-300" />
        <p className="text-white/40 text-xs tracking-[0.2em]">{label}</p>
      </div>
      <p className="text-white/85 text-sm">{value}</p>
    </div>
  );
}

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

    try {
      const response = await fetch("/api/generate-date", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mood,
          budget,
          setting,
          time,
          location: location.trim(),
          note: note.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrorMessage(data.error ?? "Something went wrong.");
        setPhase("error");
        return;
      }

      setOptions(data.options);
      setSavedIndexes(new Array(data.options.length).fill(false));
      setPhase("result");
    } catch {
      setErrorMessage(
        "Couldn't reach the date generator. Check your connection and try again."
      );
      setPhase("error");
    }
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

    // Saved plans render on the server, so refresh to pick it up.
    router.refresh();
  }

  return (
    <>
      {phase === "form" && (
        <div className="rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-8">
          <div className="mb-6">
            <p className="text-white/50 text-sm mb-3 tracking-[0.15em]">
              LOCATION
            </p>

            <input
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
            <p className="text-white/50 text-sm mb-3 tracking-[0.15em]">
              ANYTHING IN MIND? (OPTIONAL)
            </p>

            <textarea
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
          <p className="text-white/60">Thinking of something worth the drive...</p>
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
              <div
                key={index}
                className="rounded-3xl border border-pink-300/30 bg-pink-500/5 backdrop-blur-xl p-7"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="rounded-full bg-pink-500/20 p-1.5">
                    <Calendar className="w-3.5 h-3.5 text-pink-200" />
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

                <button
                  onClick={() => savePlan(index)}
                  disabled={savedIndexes[index]}
                  className="w-full px-5 py-3 rounded-full bg-pink-500 hover:bg-pink-400 disabled:bg-emerald-500/30 disabled:text-emerald-100 transition text-sm font-semibold"
                >
                  {savedIndexes[index] ? "Saved ✓" : "Save this one"}
                </button>
              </div>
            ))}
          </div>

          <p className="text-white/30 text-xs mb-6">
            Named places are AI best guesses — worth checking they&apos;re still
            open before you go.
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
