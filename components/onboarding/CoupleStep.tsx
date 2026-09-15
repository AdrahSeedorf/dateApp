"use client";

import { useActionState } from "react";
import CoupleFields, { type CoupleValues } from "@/components/couple/CoupleFields";
import { saveCoupleProfile, type CoupleState } from "@/app/welcome/couple-actions";
import { Button, Card, Field } from "@/components/ui";

type Props = {
  values: CoupleValues;
  /** Skipped for the partner: the creator has usually filled it already. */
  askForFirstMemory: boolean;
};

export default function CoupleStep({ values, askForFirstMemory }: Props) {
  const [state, formAction, pending] = useActionState<CoupleState, FormData>(
    saveCoupleProfile,
    {}
  );

  return (
    <form action={formAction} className="space-y-space-lg">
      <CoupleFields values={values} />

      {askForFirstMemory && (
        // The one question that stops the vault being empty on first sight.
        // Everything else on this screen is configuration; this is content.
        <Card elevation="flat" className="space-y-space-md p-space-lg">
          <div>
            <p className="text-label-sm text-tertiary tracking-[0.15em]">
              FOUNDATIONAL MEMORY
            </p>
            <p className="mt-space-xs text-body-sm text-on-surface-variant">
              One line, so the vault isn&apos;t empty the first time you open
              it. You can add photos to it later.
            </p>
          </div>

          <Field
            name="first_memory"
            label="Where did you first meet?"
            placeholder="The corner table at Café Mogador"
            maxLength={160}
          />

          <Field
            name="first_memory_where"
            label="Roughly where (optional)"
            placeholder="Newtown"
          />
        </Card>
      )}

      {state.error && (
        <p role="alert" className="text-body-sm text-error">
          {state.error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Saving…" : "Save and continue"}
      </Button>
    </form>
  );
}
