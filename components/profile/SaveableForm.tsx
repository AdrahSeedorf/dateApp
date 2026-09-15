"use client";

import { ReactNode } from "react";
import { useActionState } from "react";
import { Button, Card } from "@/components/ui";
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
    <Card as="form" action={formAction} className="mb-space-lg p-8">
      <h2 className="font-headline text-headline-sm text-on-surface mb-space-xs">
        {title}
      </h2>

      {description && (
        <p className="mb-space-lg text-body-sm text-on-surface-variant leading-relaxed">
          {description}
        </p>
      )}

      {children}

      <div className="mt-space-lg flex items-center gap-space-md">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>

        {/* aria-live so the outcome is announced. These sections save in
            place with no navigation, so without it a screen reader user gets
            no confirmation that anything happened. */}
        <p aria-live="polite" className="text-body-sm">
          {state.saved && (
            <span className="text-tertiary">{state.saved}</span>
          )}
          {state.error && <span className="text-error">{state.error}</span>}
        </p>
      </div>
    </Card>
  );
}
