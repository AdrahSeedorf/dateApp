import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import DateGenerator from "@/components/DateGenerator";
import { listPlans } from "@/lib/datePlans";
import PlanCard from "@/components/dates/PlanCard";
import { Screen, ScreenHeader, Section } from "@/components/ui";

export default async function DatesPage() {
  const session = await requireOnboarded();
  const supabase = await createClient();

  if (!session.coupleId) redirect("/home");

  const { plans, error } = await listPlans(supabase);

  // Grouped by where each one is in its life, because that is what decides
  // what you can do with it. A flat list of "saved ideas" was fine when
  // nothing ever happened to them.
  const live = plans.filter((p) => p.status === "live");
  const upcoming = plans
    .filter((p) => p.status === "planned")
    .sort((a, b) => (a.scheduled_for ?? "").localeCompare(b.scheduled_for ?? ""));
  const needsWritingUp = plans.filter(
    (p) => p.status === "done" && !p.memory_id
  );
  const ideas = plans.filter((p) => p.status === "saved");
  const past = plans.filter(
    (p) => (p.status === "done" && p.memory_id) || p.status === "cancelled"
  );

  return (
    <Screen withNav className="mx-auto max-w-3xl">
      <Link
        href="/home"
        className="mt-space-lg inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
      >
        ← Our Journey
      </Link>

      <ScreenHeader
        eyebrow="Plan a date"
        title="What should we do?"
        body="Two real options, grounded in actual places near you."
      />

      <DateGenerator coupleId={session.coupleId} />

      {error && (
        <p role="alert" className="mt-space-lg text-body-sm text-error">
          {error}
        </p>
      )}

      {live.length > 0 && (
        <Section title="Happening now" className="mt-space-xl">
          <div className="space-y-space-sm">
            {live.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </Section>
      )}

      {needsWritingUp.length > 0 && (
        <Section title="Waiting to be written up" className="mt-space-xl">
          <div className="space-y-space-sm">
            {needsWritingUp.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </Section>
      )}

      {upcoming.length > 0 && (
        <Section title="In the diary" className="mt-space-xl">
          <div className="space-y-space-sm">
            {upcoming.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </Section>
      )}

      {ideas.length > 0 && (
        <Section
          title={`Ideas (${ideas.length})`}
          className="mt-space-xl"
        >
          <p className="mb-space-md text-body-sm text-on-surface-variant">
            Saved but not in the diary. Open one to give it a day.
          </p>

          <div className="space-y-space-sm">
            {ideas.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </Section>
      )}

      {past.length > 0 && (
        <Section title="Been and gone" className="mt-space-xl">
          <div className="space-y-space-sm">
            {past.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </Section>
      )}

    </Screen>
  );
}
