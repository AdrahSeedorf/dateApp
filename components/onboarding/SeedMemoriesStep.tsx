"use client";

import { useActionState, useTransition } from "react";
import { Button, Card, Field } from "@/components/ui";
import { seedMemories, type SeedState } from "@/app/welcome/memory-actions";

type Props = {
  onSkip: () => Promise<void>;
};

/**
 * Three quick rows, title and date only.
 *
 * No photos here on purpose — uploading three files is a long detour at the
 * end of onboarding, and the goal is only that the app stops being empty.
 * Photos can be added to any of these afterwards.
 */
const PROMPTS = [
  "Where you first met",
  "A trip you both still talk about",
  "An ordinary day that stuck",
];

export default function SeedMemoriesStep({ onSkip }: Props) {
  const [state, formAction, pending] = useActionState<SeedState, FormData>(
    seedMemories,
    {}
  );

  const [skipping, startTransition] = useTransition();

  function skip() {
    startTransition(async () => {
      await onSkip();
    });
  }

  return (
    <form action={formAction}>
      <div className="space-y-space-md mb-space-md">
        {PROMPTS.map((prompt, slot) => (
          // flat rather than glass: three stacked blur layers here is a lot
          // of compositing for what is really just a grouped form row.
          <Card key={slot} elevation="flat" className="p-space-md space-y-space-sm">
            <Field
              id={`title-${slot}`}
              name={`title-${slot}`}
              label={prompt}
              placeholder="What was it?"
              autoComplete="off"
            />

            <Field
              id={`date-${slot}`}
              name={`date-${slot}`}
              label="When"
              type="date"
            />
          </Card>
        ))}
      </div>

      <p className="text-body-sm text-on-surface-variant mb-space-lg">
        Fill in as many as you like. The date is optional, and you can add
        photos to any of these later.
      </p>

      {state.error && (
        <p role="alert" className="text-body-sm text-error mb-space-md">
          {state.error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Saving…" : "Save and finish"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        fullWidth
        onClick={skip}
        disabled={skipping}
        className="mt-space-sm"
      >
        Skip for now
      </Button>
    </form>
  );
}
