"use client";

import { useActionState } from "react";
import { Button, Field } from "@/components/ui";
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
    <form action={formAction} className="space-y-space-lg">
      <Field
        id={name}
        name={name}
        label={label}
        placeholder={placeholder}
        hint={hint}
        error={state.error}
        defaultValue={defaultValue}
        autoComplete="off"
        autoFocus
      />

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
