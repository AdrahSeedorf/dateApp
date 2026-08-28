"use client";

import { ReactNode } from "react";
import { useActionState } from "react";
import type { SaveState } from "@/app/profile/actions";

type Props = {
  action: (prev: SaveState, formData: FormData) => Promise<SaveState>;
  title: string;
  description?: string;
  submitLabel?: string;
  children: ReactNode;
};

/**
 * A profile section that saves on its own.
 *
 * Each section is its own form so saving your interests can't fail because
 * of something unrelated in another section, and a failure only ever costs
 * you the section you were editing.
 */
export default function SaveableForm({
  action,
  title,
  description,
  submitLabel = "Save",
  children,
}: Props) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(
    action,
    {}
  );

  return (
    <form
      action={formAction}
      className="rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-8 mb-6"
    >
      <h2 className="text-xl font-semibold mb-2">{title}</h2>

      {description && (
        <p className="text-white/50 text-sm mb-6 leading-relaxed">
          {description}
        </p>
      )}

      {children}

      <div className="flex items-center gap-4 mt-6">
        <button
          type="submit"
          disabled={pending}
          className="px-6 py-3 rounded-full bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-white/40 transition text-sm font-semibold"
        >
          {pending ? "Saving..." : submitLabel}
        </button>

        {state.saved && (
          <p className="text-emerald-300 text-sm">{state.saved}</p>
        )}

        {state.error && (
          <p className="text-pink-200 text-sm">{state.error}</p>
        )}
      </div>
    </form>
  );
}
