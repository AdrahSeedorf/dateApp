"use client";

import { useActionState, useTransition } from "react";
import PrefsFields, { EMPTY_PREFS } from "@/components/prefs/PrefsFields";
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
      <p className="text-white/30 text-xs mb-6">
        Tap whatever fits. All of this is optional, and you can change it
        later.
      </p>

      <PrefsFields values={EMPTY_PREFS} />

      {state.error && (
        <p className="text-pink-200 text-sm mt-4">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full mt-6 px-6 py-4 rounded-full bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-white/40 transition font-semibold"
      >
        {pending ? "Saving..." : "Save and continue"}
      </button>

      <button
        type="button"
        onClick={skip}
        disabled={skipping}
        className="w-full mt-3 px-6 py-3 rounded-full text-white/40 hover:text-white/70 transition text-sm"
      >
        Skip for now
      </button>
    </form>
  );
}
