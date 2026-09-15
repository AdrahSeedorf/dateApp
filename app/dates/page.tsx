import Link from "next/link";
import { redirect } from "next/navigation";
import { BookHeart, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import DateGenerator from "@/components/DateGenerator";
import { Card, Screen, ScreenHeader, Section } from "@/components/ui";

type SavedPlan = {
  id: string;
  title: string;
  activity: string | null;
  location_type: string | null;
  budget_estimate: string | null;
  status: string;
  created_at: string;
};

export default async function DatesPage() {
  const session = await requireOnboarded();
  const supabase = await createClient();

  if (!session.coupleId) redirect("/home");

  const { data: plans, error } = await supabase
    .from("date_plans")
    .select("id, title, activity, location_type, budget_estimate, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dates] plans query failed", error.message);
  }

  const savedPlans = (plans ?? []) as SavedPlan[];

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

      {savedPlans.length > 0 && (
        <Section
          title={`Saved ideas (${savedPlans.length})`}
          className="mt-space-xl"
        >
          <div className="space-y-space-md">
            {savedPlans.map((plan) => (
              <Card key={plan.id} elevation="flat" className="p-space-lg">
                <div className="mb-space-sm flex items-start justify-between gap-space-md">
                  <div className="min-w-0">
                    <p className="mb-1 text-title-md text-on-surface">
                      {plan.title}
                    </p>

                    {plan.location_type && (
                      <p className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="line-clamp-1">
                          {plan.location_type}
                        </span>
                      </p>
                    )}
                  </div>

                  {plan.budget_estimate && (
                    <p className="shrink-0 text-label-sm text-on-surface-variant">
                      {plan.budget_estimate}
                    </p>
                  )}
                </div>

                {plan.activity && (
                  <p className="mb-space-md text-body-md text-on-surface-variant leading-relaxed">
                    {plan.activity}
                  </p>
                )}

                <Link
                  href={`/memories/new?plan=${plan.id}`}
                  className="inline-flex items-center gap-2 text-body-sm text-primary transition hover:text-primary-container"
                >
                  <BookHeart className="h-4 w-4" aria-hidden />
                  We did this — save the memory
                </Link>
              </Card>
            ))}
          </div>
        </Section>
      )}
    </Screen>
  );
}
