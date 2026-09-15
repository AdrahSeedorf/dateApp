"use client";

import { cn } from "@/components/ui";

type Props = {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
};

/**
 * A single-choice row of pills.
 *
 * Kept as buttons with `aria-pressed` rather than the token Chip component:
 * these drive client state for an immediate fetch, not a form submission, so
 * there's nothing for a radio group to post. Styling matches Chip so the two
 * read as the same control.
 */
export default function PillGroup({ label, options, value, onChange }: Props) {
  return (
    <fieldset className="mb-space-lg border-0 p-0 m-0">
      <legend className="text-label-sm text-on-surface-variant tracking-[0.15em] mb-space-sm">
        {label.toUpperCase()}
      </legend>

      <div className="flex flex-wrap gap-space-sm">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={cn(
              "min-h-[44px] rounded-full border px-5 text-label-md transition",
              value === option
                ? "border-primary bg-[rgb(var(--c-glow-a)/0.18)] text-on-surface font-semibold"
                : "border-[var(--glass-rim)] bg-[var(--glass-1)] text-on-surface-variant hover:bg-[var(--glass-2)] hover:text-on-surface"
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
