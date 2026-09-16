"use client";

import { useActionState, useState } from "react";
import { CalendarCheck, Plus, X } from "lucide-react";
import { ROLE_SUGGESTIONS, type DatePlan, type Role } from "@/lib/datePlans";
import { planDate, type PlanState } from "@/app/dates/actions";
import { Button, Card, Field, TextArea, cn } from "@/components/ui";

type Props = {
  plan: DatePlan;
  partnerName: string;
  /** Today, from the server — the clock isn't read during render. */
  today: string;
};

const WHO: { key: Role["who"]; label: (partner: string) => string }[] = [
  { key: "you", label: () => "You" },
  { key: "them", label: (partner) => partner },
  { key: "both", label: () => "Both" },
];

/**
 * Turning an idea into a plan.
 *
 * Roles are the part worth getting right. They're not administration — they
 * are the things couples actually get snippy about on the night, and writing
 * "you're driving, I'm booking" down beforehand is most of the value.
 */
export default function PlanForm({ plan, partnerName, today }: Props) {
  const [state, formAction, pending] = useActionState<PlanState, FormData>(
    planDate,
    {}
  );

  // Start from whatever's already agreed, or one empty row to write in.
  const [roles, setRoles] = useState<Role[]>(
    plan.roles.length > 0 ? plan.roles : [{ label: "", who: "both" }]
  );

  const rescheduling = plan.status === "planned";

  function update(index: number, patch: Partial<Role>) {
    setRoles((prev) =>
      prev.map((role, i) => (i === index ? { ...role, ...patch } : role))
    );
  }

  return (
    <form action={formAction} className="space-y-space-lg">
      <input type="hidden" name="id" value={plan.id} />

      <Card className="space-y-space-lg p-8">
        <div className="grid gap-space-md sm:grid-cols-2">
          <Field
            name="scheduled_for"
            type="date"
            label="Which day"
            defaultValue={plan.scheduled_for ?? ""}
            // Past dates are allowed: people log a date they already had.
            min={plan.status === "saved" ? today : undefined}
            required
          />

          <Field
            name="scheduled_time"
            type="time"
            label="What time (optional)"
            defaultValue={plan.scheduled_time?.slice(0, 5) ?? ""}
            hint="Leave it out if you've only agreed on 'evening'."
          />
        </div>
      </Card>

      <Card className="space-y-space-md p-8">
        <div>
          <p className="text-label-sm text-on-surface-variant tracking-[0.15em]">
            WHO&apos;S DOING WHAT
          </p>
          <p className="mt-space-xs text-body-sm text-on-surface-variant">
            The things that cause a small argument at 6pm if nobody said.
          </p>
        </div>

        <ul className="space-y-space-sm">
          {roles.map((role, index) => (
            <li key={index} className="flex flex-wrap items-center gap-space-sm">
              <input
                name="role_label"
                value={role.label}
                onChange={(e) => update(index, { label: e.target.value })}
                placeholder="Driving"
                list="role-suggestions"
                maxLength={60}
                className="min-h-[44px] flex-1 rounded-lg border border-[var(--glass-rim)] bg-[rgb(255_255_255/0.05)] px-4 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
                aria-label={`Role ${index + 1}`}
              />

              {/* Radios rather than a select: three options, and tapping one
                  is faster than opening a menu on a phone. */}
              <div className="flex gap-1" role="group" aria-label="Who">
                {WHO.map((option) => (
                  <label key={option.key} className="cursor-pointer">
                    <input
                      type="radio"
                      name="role_who"
                      value={option.key}
                      checked={role.who === option.key}
                      onChange={() => update(index, { who: option.key })}
                      className="sr-only peer"
                    />
                    <span
                      className={cn(
                        "flex min-h-[44px] items-center rounded-lg border px-3 text-label-md transition",
                        role.who === option.key
                          ? "border-primary bg-[rgb(var(--c-glow-a)/0.18)] text-on-surface"
                          : "border-[var(--glass-rim)] text-on-surface-variant hover:text-on-surface",
                        "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary"
                      )}
                    >
                      {option.label(partnerName)}
                    </span>
                  </label>
                ))}
              </div>

              {roles.length > 1 && (
                <button
                  type="button"
                  onClick={() => setRoles((p) => p.filter((_, i) => i !== index))}
                  aria-label={`Remove ${role.label || "this role"}`}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-on-surface-variant transition hover:text-error"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>

        <datalist id="role-suggestions">
          {ROLE_SUGGESTIONS.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setRoles((p) => [...p, { label: "", who: "both" }])}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add another
        </Button>
      </Card>

      <Card className="p-8">
        <TextArea
          name="notes"
          label="Anything to remember"
          rows={3}
          defaultValue={plan.notes ?? ""}
          placeholder="Book the table by Thursday. Bring the good jacket."
        />
      </Card>

      {state.error && (
        <p role="alert" className="text-body-sm text-error">
          {state.error}
        </p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        <CalendarCheck className="h-4 w-4" aria-hidden />
        {pending
          ? "Saving…"
          : rescheduling
            ? "Update the plan"
            : "Put it in the diary"}
      </Button>
    </form>
  );
}
