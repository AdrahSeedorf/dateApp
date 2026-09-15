"use client";

import { useEffect, useState } from "react";
import type { DistanceMode } from "@/lib/distance";
import { Field, cn } from "@/components/ui";

type Props = {
  mode: DistanceMode;
  reunionOn: string;
  /** Stored zone, if there is one. Shown so it's clear what's been recorded. */
  timezone: string | null;
};

const OPTIONS: { key: DistanceMode; label: string; hint: string }[] = [
  {
    key: "together",
    label: "Same place",
    hint: "Date ideas name real places near you.",
  },
  {
    key: "apart",
    label: "Long distance",
    hint: "Ideas become things you can do at the same time, apart.",
  },
];

export default function DistanceFields({ mode, reunionOn, timezone }: Props) {
  // `auto` means nobody has answered. Shown as neither option selected, so
  // the choice reads as unmade rather than silently defaulted.
  const [selected, setSelected] = useState<DistanceMode>(mode);
  const [detected, setDetected] = useState<string | null>(null);

  /**
   * The browser knows the zone exactly, so ask it rather than guessing from a
   * free-text town. Read in an effect because it isn't available on the
   * server and would otherwise cause a hydration mismatch.
   */
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDetected(Intl.DateTimeFormat().resolvedOptions().timeZone ?? null);
    } catch {
      // Some locked-down browsers refuse; the feature degrades to no clocks.
    }
  }, []);

  return (
    <div className="space-y-space-lg">
      <fieldset className="border-0 p-0 m-0">
        <legend className="mb-space-sm text-label-sm text-on-surface-variant tracking-[0.15em]">
          ARE YOU IN THE SAME PLACE?
        </legend>

        <div className="grid gap-space-sm sm:grid-cols-2">
          {OPTIONS.map((option) => (
            <label
              key={option.key}
              className={cn(
                "cursor-pointer rounded-lg border p-space-md transition",
                selected === option.key
                  ? "border-primary bg-[rgb(var(--c-glow-a)/0.12)]"
                  : "border-[var(--glass-rim)] bg-[var(--glass-1)] hover:bg-[var(--glass-2)]",
                "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
              )}
            >
              <input
                type="radio"
                name="distance_mode"
                value={option.key}
                checked={selected === option.key}
                onChange={() => setSelected(option.key)}
                className="sr-only"
              />
              <span className="block text-body-md text-on-surface">
                {option.label}
              </span>
              <span className="mt-0.5 block text-body-sm text-on-surface-variant">
                {option.hint}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {selected === "apart" && (
        <>
          <Field
            name="reunion_on"
            type="date"
            label="Next time you're together"
            defaultValue={reunionOn}
            hint="Shows as a countdown on your home screen. Leave it empty if nothing's booked."
          />

          {/* Sent as a hidden field rather than written silently on page
              load: a timezone is a piece of personal information, and it
              should be saved because someone pressed save. */}
          <input type="hidden" name="timezone" value={detected ?? timezone ?? ""} />

          <p className="text-body-sm text-on-surface-variant">
            {detected
              ? `Your device says you're in ${detected}. Saving records that so you both see each other's local time.`
              : "Your browser wouldn't tell us your timezone, so the clocks will stay hidden."}
          </p>
        </>
      )}
    </div>
  );
}
