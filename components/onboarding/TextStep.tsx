"use client";

import { useActionState } from "react";
import type { StepState } from "@/app/welcome/actions";

type Props = {
  name: string;
  label: string;
  placeholder: string;
  hint?: string;
  defaultValue?: string;
  submitLabel?: string;
  action: (prev: StepState, formData: FormData) => Promise<StepState>;
};

/**
 * A single-question onboarding step.
 *
 * Errors come back from the server action rather than being duplicated in
 * client-side checks — one set of rules, and the one that actually guards
 * the database is the one the person sees.
 */
export default function TextStep({
  name,
  label,
  placeholder,
  hint,
  defaultValue = "",
  submitLabel = "Continue",
  action,
}: Props) {
  const [state, formAction, pending] = useActionState<StepState, FormData>(
    action,
    {}
  );

  return (
    <form action={formAction}>
      <label
        htmlFor={name}
        className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
      >
        {label}
      </label>

      <input
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        autoComplete="off"
        autoFocus
        aria-describedby={state.error ? `${name}-error` : undefined}
        aria-invalid={state.error ? true : undefined}
        className="w-full px-5 py-3 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30"
      />

      {hint && !state.error && (
        <p className="text-white/30 text-xs mt-2">{hint}</p>
      )}

      {state.error && (
        <p id={`${name}-error`} className="text-pink-200 text-sm mt-2">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full mt-6 px-6 py-4 rounded-full bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-white/40 transition font-semibold"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
