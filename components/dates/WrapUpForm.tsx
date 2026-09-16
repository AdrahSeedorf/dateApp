"use client";

import { useActionState } from "react";
import { BookHeart } from "lucide-react";
import { CATEGORY_SUGGESTIONS } from "@/lib/memories";
import { wrapUpDate, type PlanState } from "@/app/dates/actions";
import { Button, Card, Field, TextArea } from "@/components/ui";

type Props = {
  planId: string;
  defaultTitle: string;
  defaultDescription: string;
  defaultLocation: string;
  defaultDate: string;
};

/**
 * The last step: a draft memory, already written.
 *
 * Everything here arrives filled in. The person's job is to change what's
 * wrong and press save, not to compose an account of their own evening at
 * the end of it — which is the reason most dates never became memories.
 */
export default function WrapUpForm({
  planId,
  defaultTitle,
  defaultDescription,
  defaultLocation,
  defaultDate,
}: Props) {
  const [state, formAction, pending] = useActionState<PlanState, FormData>(
    wrapUpDate,
    {}
  );

  return (
    <form action={formAction} className="space-y-space-lg">
      <input type="hidden" name="plan_id" value={planId} />

      <Card className="space-y-space-lg p-8">
        <Field name="title" label="What to call it" defaultValue={defaultTitle} required />

        <TextArea
          name="description"
          label="What happened"
          rows={8}
          defaultValue={defaultDescription}
          placeholder="The bit you'd want to remember."
        />

        <div className="grid gap-space-md sm:grid-cols-2">
          <Field
            name="memory_date"
            type="date"
            label="When"
            defaultValue={defaultDate}
          />

          <Field name="location" label="Where" defaultValue={defaultLocation} />
        </div>

        <Field
          name="category"
          label="Category (optional)"
          list="wrap-categories"
          placeholder="Ordinary days"
        />

        <datalist id="wrap-categories">
          {CATEGORY_SUGGESTIONS.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      </Card>

      {state.error && (
        <p role="alert" className="text-body-sm text-error">
          {state.error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        <BookHeart className="h-4 w-4" aria-hidden />
        {pending ? "Keeping it…" : "Keep this one"}
      </Button>

      {/* No skip button. Leaving means it stays on the date, and the dashboard
          asks again — a date that ended is not a thing to dismiss. */}
    </form>
  );
}
