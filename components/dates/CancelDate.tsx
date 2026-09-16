"use client";

import { useState } from "react";
import { CalendarX } from "lucide-react";
import { cancelDate } from "@/app/dates/actions";
import { Button, Card, Field } from "@/components/ui";

/**
 * Calling it off.
 *
 * Offers rescheduling first, and means it. Most cancellations are really
 * "not tonight" rather than "not ever", and a flow that only offers the
 * final option pushes people into it.
 */
export default function CancelDate({ planId }: { planId: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant transition hover:text-error"
      >
        <CalendarX className="h-4 w-4" aria-hidden />
        Call it off
      </button>
    );
  }

  return (
    <Card elevation="raised" className="space-y-space-md p-space-lg">
      <p className="text-body-md text-on-surface leading-relaxed">
        If it&apos;s just the wrong night,{" "}
        <strong className="text-primary">pick another day above</strong>{" "}
        instead — the plan and the roles stay as they are.
      </p>

      <form action={cancelDate} className="space-y-space-md">
        <input type="hidden" name="id" value={planId} />

        <Field
          name="reason"
          label="What happened (optional)"
          placeholder="Rained out"
          hint="Only for you two. It stays on the date if you bring it back."
        />

        <div className="flex flex-col gap-space-sm sm:flex-row">
          <Button type="submit" variant="danger" size="sm" className="flex-1">
            Cancel the date
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setConfirming(false)}
            className="flex-1"
          >
            Keep it
          </Button>
        </div>
      </form>
    </Card>
  );
}
