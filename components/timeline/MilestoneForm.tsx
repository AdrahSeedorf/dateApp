"use client";

import { useActionState, useState } from "react";
import { saveMilestone, type MilestoneState } from "@/app/timeline/actions";
import { Button, Card, Field, TextArea, cn } from "@/components/ui";

/**
 * Suggested icons.
 *
 * A palette rather than a free-text emoji field: an emoji keyboard is
 * awkward on desktop, and the icon sits on a 16px node where most glyphs are
 * unreadable anyway. Typing one directly still works — the field accepts
 * anything and the server keeps the first grapheme.
 */
const ICONS = ["❤️", "✈️", "🏠", "💍", "🎓", "🐾", "🎂", "🌊", "☕", "🎬"];

export default function MilestoneForm() {
  const [state, formAction, pending] = useActionState<MilestoneState, FormData>(
    saveMilestone,
    {}
  );

  const [icon, setIcon] = useState("");

  return (
    <form action={formAction} className="space-y-space-lg">
      <Card className="space-y-space-lg p-8">
        <Field
          name="title"
          label="What happened"
          placeholder="Moved in together"
          maxLength={120}
          required
        />

        <div className="grid gap-space-md sm:grid-cols-2">
          <Field
            name="happened_on"
            type="date"
            label="When"
            required
            hint="A date in the future is fine — it'll wait."
          />

          <Field
            name="place"
            label="Where (optional)"
            placeholder="Cobble Hill"
            maxLength={160}
          />
        </div>

        <TextArea
          name="note"
          label="Anything worth adding (optional)"
          rows={3}
          placeholder="Pizza from the box, surrounded by unbuilt shelves."
        />

        <fieldset className="border-0 p-0 m-0">
          <legend className="mb-space-sm text-label-sm text-on-surface-variant tracking-[0.15em]">
            ICON (OPTIONAL)
          </legend>

          {/* The chosen icon rides along in a hidden field so the palette and
              the free-text box can't disagree about what was picked. */}
          <input type="hidden" name="icon" value={icon} />

          <div className="flex flex-wrap gap-space-sm">
            {ICONS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={icon === option}
                aria-label={`Use ${option} as the icon`}
                onClick={() => setIcon(icon === option ? "" : option)}
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border text-lg transition",
                  icon === option
                    ? "border-primary bg-[rgb(var(--c-glow-a)/0.18)]"
                    : "border-[var(--glass-rim)] bg-[var(--glass-1)] hover:bg-[var(--glass-2)]"
                )}
              >
                <span aria-hidden>{option}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </Card>

      {state.error && (
        <p role="alert" className="text-body-sm text-error">
          {state.error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Saving…" : "Add to the timeline"}
      </Button>
    </form>
  );
}
