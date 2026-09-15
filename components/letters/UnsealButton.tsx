"use client";

import { useActionState } from "react";
import { LockOpen } from "lucide-react";
import { openLetterAction, type LetterFormState } from "@/app/letters/actions";
import { Button } from "@/components/ui";

type Props = {
  letterId: string;
  /** "Open on a tough day" letters deserve a gentler prompt than a date. */
  onRequest: boolean;
};

export default function UnsealButton({ letterId, onRequest }: Props) {
  const [state, formAction, pending] = useActionState<LetterFormState, FormData>(
    openLetterAction,
    {}
  );

  return (
    <form action={formAction} className="space-y-space-sm">
      <input type="hidden" name="id" value={letterId} />

      <Button type="submit" fullWidth disabled={pending}>
        <LockOpen className="h-4 w-4" aria-hidden />
        {pending
          ? "Breaking the seal…"
          : onRequest
            ? "I could use this today"
            : "Break the seal"}
      </Button>

      {state.error && (
        <p role="alert" className="text-body-sm text-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
