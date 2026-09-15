"use client";

import { useActionState, useState } from "react";
import { Lock, Save } from "lucide-react";
import { SEAL_COLOURS } from "@/lib/letters";
import { saveLetter, type LetterFormState } from "@/app/letters/actions";
import { Button, Card, Field, TextArea, cn } from "@/components/ui";

type Props = {
  partnerName: string;
  /**
   * Earliest selectable unlock date, computed on the server.
   *
   * Deliberately a prop rather than `Date.now()` here: reading the clock
   * during render is impure, and a value that shifts between renders is
   * exactly the kind of thing that makes a date input behave oddly.
   */
  minUnlockDate: string;
};

/**
 * Writing a letter.
 *
 * The one thing this screen has to get right is that sealing is permanent.
 * The database won't let a sealed letter be edited or deleted, which is what
 * makes the feature mean anything — but it also means a mis-tap is
 * unrecoverable, so the seal button asks first and says plainly what it is
 * about to do.
 */
export default function ComposeForm({ partnerName, minUnlockDate }: Props) {
  const [state, formAction, pending] = useActionState<LetterFormState, FormData>(
    saveLetter,
    {}
  );

  const [trigger, setTrigger] = useState<"date" | "on_request">("date");
  const [colour, setColour] = useState<string>("rose");
  const [confirming, setConfirming] = useState(false);

  return (
    <form action={formAction} className="space-y-space-lg">
      <Card className="space-y-space-lg p-8">
        <Field
          name="title"
          label="What they'll see"
          placeholder="Open on our anniversary"
          maxLength={120}
          required
        />

        <TextArea
          name="body"
          label={`Your letter to ${partnerName}`}
          rows={12}
          placeholder="Written on a quiet Sunday morning…"
          required
        />

        <Field
          name="teaser"
          label="A line to show while it's still sealed (optional)"
          placeholder="Don't peek until the sun's down."
          maxLength={240}
          hint="They'll see this on the sealed card. Everything else stays hidden."
        />
      </Card>

      <Card className="space-y-space-lg p-8">
        <fieldset className="border-0 p-0 m-0">
          <legend className="mb-space-sm text-label-sm text-on-surface-variant tracking-[0.15em]">
            WHEN SHOULD IT OPEN?
          </legend>

          <div className="grid gap-space-sm sm:grid-cols-2">
            <label
              className={cn(
                "cursor-pointer rounded-lg border p-space-md transition",
                trigger === "date"
                  ? "border-primary bg-[rgb(var(--c-glow-a)/0.12)]"
                  : "border-[var(--glass-rim)] bg-[var(--glass-1)] hover:bg-[var(--glass-2)]"
              )}
            >
              <input
                type="radio"
                name="unlock_trigger"
                value="date"
                checked={trigger === "date"}
                onChange={() => setTrigger("date")}
                className="sr-only"
              />
              <span className="block text-body-md text-on-surface">On a day</span>
              <span className="mt-0.5 block text-body-sm text-on-surface-variant">
                Counts down. Can&apos;t be opened before then.
              </span>
            </label>

            <label
              className={cn(
                "cursor-pointer rounded-lg border p-space-md transition",
                trigger === "on_request"
                  ? "border-primary bg-[rgb(var(--c-glow-a)/0.12)]"
                  : "border-[var(--glass-rim)] bg-[var(--glass-1)] hover:bg-[var(--glass-2)]"
              )}
            >
              <input
                type="radio"
                name="unlock_trigger"
                value="on_request"
                checked={trigger === "on_request"}
                onChange={() => setTrigger("on_request")}
                className="sr-only"
              />
              <span className="block text-body-md text-on-surface">
                When they need it
              </span>
              <span className="mt-0.5 block text-body-sm text-on-surface-variant">
                No date. Waits until they ask for it.
              </span>
            </label>
          </div>
        </fieldset>

        {trigger === "date" && (
          <Field
            name="unlock_at"
            type="date"
            label="Opens on"
            // Tomorrow at the earliest: a letter that can be opened the
            // moment it's sealed isn't a time capsule.
            min={minUnlockDate}
            required
          />
        )}

        <fieldset className="border-0 p-0 m-0">
          <legend className="mb-space-sm text-label-sm text-on-surface-variant tracking-[0.15em]">
            WAX
          </legend>

          <div className="flex flex-wrap gap-space-sm">
            {SEAL_COLOURS.map((option) => (
              <label key={option.key} className="cursor-pointer">
                <input
                  type="radio"
                  name="colour"
                  value={option.key}
                  checked={colour === option.key}
                  onChange={() => setColour(option.key)}
                  className="sr-only peer"
                />
                <span
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-2 text-label-md transition",
                    colour === option.key
                      ? "border-primary text-on-surface"
                      : "border-[var(--glass-rim)] text-on-surface-variant hover:text-on-surface",
                    "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
                  )}
                >
                  <span
                    aria-hidden
                    className={cn("h-4 w-4 rounded-full", option.className)}
                  />
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      {state.error && (
        <p role="alert" className="text-body-sm text-error">
          {state.error}
        </p>
      )}

      {confirming ? (
        <Card elevation="raised" className="space-y-space-md p-space-lg">
          <p className="text-body-md text-on-surface leading-relaxed">
            Sealing is permanent. Once you do,{" "}
            <strong className="text-primary">
              you won&apos;t be able to edit or delete this
            </strong>{" "}
            — not even before {partnerName} reads it. That&apos;s the point,
            but it&apos;s worth a second look first.
          </p>

          <div className="flex flex-col gap-space-sm sm:flex-row">
            <Button
              type="submit"
              name="intent"
              value="seal"
              disabled={pending}
              className="flex-1"
            >
              <Lock className="h-4 w-4" aria-hidden />
              {pending ? "Sealing…" : "Seal it"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="flex-1"
            >
              Keep editing
            </Button>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-space-sm sm:flex-row">
          <Button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={pending}
            className="flex-1"
          >
            <Lock className="h-4 w-4" aria-hidden />
            Seal and send
          </Button>

          <Button
            type="submit"
            name="intent"
            value="draft"
            variant="secondary"
            disabled={pending}
            className="flex-1"
          >
            <Save className="h-4 w-4" aria-hidden />
            {pending ? "Saving…" : "Save as draft"}
          </Button>
        </div>
      )}
    </form>
  );
}
