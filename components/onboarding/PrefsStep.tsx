"use client";

import { useActionState, useTransition } from "react";
import { Lock } from "lucide-react";
import { ACCESS_NEEDS } from "@/lib/accessNeeds";
import { savePrefs, type PrefsState } from "@/app/welcome/prefs-actions";

type Props = {
  onSkip: () => Promise<void>;
};

function ListField({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder: string;
}) {
  return (
    <div className="mb-5">
      <label
        htmlFor={name}
        className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full px-5 py-3 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30"
      />
    </div>
  );
}

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
      <p className="text-white/30 text-xs mb-5">
        Separate each with a comma. All of this is optional.
      </p>

      <ListField
        name="interests"
        label="THINGS YOU BOTH LIKE"
        placeholder="live music, hiking, good coffee"
      />

      <ListField
        name="want_to_try"
        label="THINGS YOU'D LIKE TO TRY"
        placeholder="pottery, kayaking"
      />

      <ListField
        name="avoid"
        label="THINGS TO AVOID"
        placeholder="seafood, late nights"
      />

      <fieldset className="border-0 p-0 m-0 mt-8 mb-5">
        <legend className="text-white/50 text-sm mb-2 tracking-[0.1em]">
          ANYTHING A DATE NEEDS TO WORK AROUND
        </legend>

        <p className="text-white/30 text-xs mb-4">
          So we never suggest something that doesn&apos;t work for you.
        </p>

        <div className="space-y-2">
          {ACCESS_NEEDS.map((need) => (
            <label
              key={need.key}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition p-4 cursor-pointer"
            >
              <input
                type="checkbox"
                name={need.key}
                className="mt-1 accent-pink-500 w-4 h-4 shrink-0"
              />

              <span>
                <span className="block text-sm text-white/85">
                  {need.label}
                </span>
                {need.hint && (
                  <span className="block text-xs text-white/40 mt-0.5">
                    {need.hint}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mb-5">
        <label
          htmlFor="access_notes"
          className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
        >
          ANYTHING ELSE
        </label>

        <textarea
          id="access_notes"
          name="access_notes"
          rows={2}
          placeholder="Anything the boxes above don't cover"
          className="w-full px-5 py-3 rounded-2xl border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30 resize-none"
        />
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4 cursor-pointer mb-2">
        <input
          type="checkbox"
          name="share_access_with_partner"
          className="mt-1 accent-pink-500 w-4 h-4 shrink-0"
        />

        <span>
          <span className="flex items-center gap-2 text-sm text-white/85">
            <Lock className="w-3.5 h-3.5 text-white/40" aria-hidden />
            Let your partner see this
          </span>
          <span className="block text-xs text-white/40 mt-1 leading-relaxed">
            Off by default. Date ideas account for your needs either way —
            this only controls whether they can read them.
          </span>
        </span>
      </label>

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
