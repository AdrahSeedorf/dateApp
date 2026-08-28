"use client";

import { useActionState, useTransition } from "react";
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
      <div className="space-y-4 mb-5">
        {PROMPTS.map((prompt, slot) => (
          <div
            key={slot}
            className="rounded-2xl border border-white/10 bg-white/5 p-4"
          >
            <label
              htmlFor={`title-${slot}`}
              className="block text-white/40 text-xs tracking-[0.15em] mb-2"
            >
              {prompt.toUpperCase()}
            </label>

            <input
              id={`title-${slot}`}
              name={`title-${slot}`}
              placeholder="What was it?"
              autoComplete="off"
              className="w-full px-4 py-2.5 mb-2 rounded-full border border-white/10 bg-black/20 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30"
            />

            <input
              id={`date-${slot}`}
              name={`date-${slot}`}
              type="date"
              aria-label={`Date for ${prompt}`}
              className="w-full px-4 py-2.5 rounded-full border border-white/10 bg-black/20 focus:border-pink-300 focus:outline-none text-sm text-white"
            />
          </div>
        ))}
      </div>

      <p className="text-white/30 text-xs mb-6">
        Fill in as many as you like. The date is optional, and you can add
        photos to any of these later.
      </p>

      {state.error && (
        <p className="text-pink-200 text-sm mb-4">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full px-6 py-4 rounded-full bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-white/40 transition font-semibold"
      >
        {pending ? "Saving..." : "Save and finish"}
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
