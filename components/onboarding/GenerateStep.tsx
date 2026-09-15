"use client";

import { useState, useTransition } from "react";
import PillGroup from "@/components/dates/PillGroup";
import DateOptionCard, {
  AccessWarning,
  GeneratedCaveat,
} from "@/components/dates/DateOptionCard";
import { Button } from "@/components/ui";
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
      <div className="space-y-space-lg">
        <div className="space-y-space-md">
          {options.map((option, index) => (
            <DateOptionCard
              key={index}
              option={option}
              index={index}
              action={
                <Button
                  fullWidth
                  size="sm"
                  variant={savedIndex === index ? "secondary" : "primary"}
                  onClick={() => save(index)}
                  disabled={pending || savedIndex !== null}
                >
                  {savedIndex === index ? "Saved ✓" : "Save this one"}
                </Button>
              }
            />
          ))}
        </div>

        {accessWarning && <AccessWarning />}

        {error && (
          <p role="alert" className="text-body-sm text-error">
            {error}
          </p>
        )}

        <GeneratedCaveat />

        <div className="flex flex-col gap-space-sm sm:flex-row">
          <Button
            variant="secondary"
            onClick={generate}
            disabled={loading || pending}
            className="flex-1"
          >
            {loading ? "Thinking…" : "Try two more"}
          </Button>

          <Button onClick={finish} disabled={pending} className="flex-1">
            Continue
          </Button>
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

      {error && (
        <p role="alert" className="text-body-sm text-error mb-space-md">
          {error}
        </p>
      )}

      <Button fullWidth onClick={generate} disabled={!ready || loading}>
        {loading ? "Thinking of something…" : "Show me two ideas"}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        fullWidth
        onClick={finish}
        disabled={pending}
        className="mt-space-sm"
      >
        I&apos;ll do this later
      </Button>
    </div>
  );
}
