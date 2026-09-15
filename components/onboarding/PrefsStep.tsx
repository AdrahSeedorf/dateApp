"use client";

import { useActionState, useTransition } from "react";
import PrefsFields, { EMPTY_PREFS } from "@/components/prefs/PrefsFields";
import { Button } from "@/components/ui";
import { savePrefs, type PrefsState } from "@/app/welcome/prefs-actions";

type Props = {
  onSkip: () => Promise<void>;
};

export default function PrefsStep({ onSkip }: Props) {
  const [state, formAction, pending] = useActionState<PrefsState, FormData>(
    savePrefs,
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
      <p className="text-body-sm text-on-surface-variant mb-space-lg">
        Tap whatever fits. All of this is optional, and you can change it
        later.
      </p>

      <PrefsFields values={EMPTY_PREFS} />

      {state.error && (
        <p role="alert" className="text-body-sm text-error mt-space-md">
          {state.error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={pending} className="mt-space-lg">
        {pending ? "Saving…" : "Save and continue"}
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
