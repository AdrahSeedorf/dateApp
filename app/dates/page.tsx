import Link from "next/link";
import { redirect } from "next/navigation";
import { BookHeart, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import DateGenerator from "@/components/DateGenerator";

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_center,#3b1030,#050510_75%)] px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/home"
          className="text-white/50 hover:text-white mb-8 inline-block"
        >
          ← Our Journey
        </Link>

        <p className="tracking-[0.35em] text-xs text-pink-300 mb-3">
          PLAN A DATE
        </p>

        <h1 className="text-3xl md:text-5xl font-bold mb-4">
          What should we do?
        </h1>

        <p className="text-white/60 mb-10">
          Two real options, grounded in actual places near you.
        </p>

        <DateGenerator coupleId={session.coupleId} />

        {savedPlans.length > 0 && (
          <div className="mt-14">
            <h2 className="text-xl font-semibold mb-5">
              Saved ideas ({savedPlans.length})
            </h2>

            <div className="space-y-4">
              {savedPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold mb-1">{plan.title}</p>

                      {plan.location_type && (
                        <p className="text-white/50 text-sm flex items-center gap-1.5">
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="line-clamp-1">
                            {plan.location_type}
                          </span>
                        </p>
                      )}
                    </div>

                    {plan.budget_estimate && (
                      <p className="text-white/40 text-xs shrink-0">
                        {plan.budget_estimate}
                      </p>
                    )}
                  </div>

                  {plan.activity && (
                    <p className="text-white/60 text-sm leading-relaxed mb-4">
                      {plan.activity}
                    </p>
                  )}

                  <Link
                    href={`/memories/new?plan=${plan.id}`}
                    className="inline-flex items-center gap-2 text-pink-300 hover:text-pink-200 text-sm"
                  >
                    <BookHeart className="w-4 h-4" />
                    We did this — save the memory
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
