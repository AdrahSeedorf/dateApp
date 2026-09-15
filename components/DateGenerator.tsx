"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PillGroup from "@/components/dates/PillGroup";
import DateOptionCard, {
  AccessWarning,
  GeneratedCaveat,
} from "@/components/dates/DateOptionCard";
import { Button, Card, Field, TextArea } from "@/components/ui";
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
        <Card className="p-8">
          <div className="mb-space-lg">
            <Field
              id="location"
              label="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Penrith, NSW"
              hint="So it can name real places near you, not generic ones."
            />
          </div>

          <PillGroup label="Mood" options={MOODS} value={mood} onChange={setMood} />
          <PillGroup label="Budget" options={BUDGETS} value={budget} onChange={setBudget} />
          <PillGroup label="Setting" options={SETTINGS} value={setting} onChange={setSetting} />
          <PillGroup label="Time available" options={TIMES} value={time} onChange={setTime} />

          <div className="mb-space-lg">
            <TextArea
              id="note"
              label="Anything in mind? (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="e.g. she's had a stressful week, keep it low-key"
              hint="This is where it gets specific."
            />
          </div>

          <Button fullWidth onClick={generate} disabled={!canGenerate}>
            Generate date ideas
          </Button>
        </Card>
      )}

      {phase === "loading" && (
        <Card className="p-16 text-center" aria-busy="true">
          <div aria-hidden className="mb-space-md animate-pulse text-4xl text-primary">
            ✦
          </div>
          {/* role=status so the wait is announced, not just drawn. */}
          <p role="status" className="text-body-md text-on-surface-variant">
            Thinking of something worth the drive…
          </p>
        </Card>
      )}

      {phase === "error" && (
        <Card className="p-8 text-center">
          <p role="alert" className="mb-space-lg break-words text-body-md text-error">
            {errorMessage}
          </p>
          <Button variant="secondary" size="sm" onClick={() => setPhase("form")}>
            Try again
          </Button>
        </Card>
      )}

      {phase === "result" && options.length > 0 && (
        <div>
          <div className="mb-space-lg grid gap-space-lg md:grid-cols-2">
            {options.map((option, index) => (
              <DateOptionCard
                key={index}
                option={option}
                index={index}
                action={
                  <Button
                    fullWidth
                    size="sm"
                    variant={savedIndexes[index] ? "secondary" : "primary"}
                    onClick={() => savePlan(index)}
                    disabled={savedIndexes[index]}
                  >
                    {savedIndexes[index] ? "Saved ✓" : "Save this one"}
                  </Button>
                }
              />
            ))}
          </div>

          {accessWarning && (
            <div className="mb-space-md">
              <AccessWarning />
            </div>
          )}

          {errorMessage && (
            <p role="alert" className="mb-space-md text-body-sm text-error">
              {errorMessage}
            </p>
          )}

          <div className="mb-space-lg">
            <GeneratedCaveat />
          </div>

          <Button variant="secondary" fullWidth onClick={generate}>
            Generate another pair
          </Button>
        </div>
      )}
    </>
  );
}
