import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MemoryForm from "@/components/MemoryForm";

type Props = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function NewMemoryPage({ searchParams }: Props) {
  const { plan: planId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.couple_id) redirect("/home");

  // If this memory came from a saved date, prefill from that plan.
  // RLS scopes the lookup, so a plan id from another couple returns nothing.
  let planTitle: string | null = null;
  let planLocation: string | null = null;

  if (planId) {
    const { data: plan } = await supabase
      .from("date_plans")
      .select("id, title, location_type")
      .eq("id", planId)
      .maybeSingle();

    if (plan) {
      planTitle = plan.title;
      planLocation = plan.location_type;
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_center,#2d0f36,#050510_75%)] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          href={planTitle ? "/dates" : "/memories"}
          className="text-white/50 hover:text-white mb-8 inline-block"
        >
          ← {planTitle ? "Plan a date" : "Our memories"}
        </Link>

        <p className="tracking-[0.35em] text-xs text-pink-200 mb-3">
          NEW MEMORY
        </p>

        <h1 className="text-3xl md:text-4xl font-bold mb-2">Keep this one</h1>

        {planTitle && (
          <p className="text-white/50 mb-8">
            From your saved date:{" "}
            <span className="text-pink-200">{planTitle}</span>
          </p>
        )}

        {!planTitle && <div className="mb-8" />}

        <MemoryForm
          coupleId={profile.couple_id}
          datePlanId={planTitle ? (planId ?? null) : null}
          initialTitle={planTitle ?? ""}
          initialLocation={planLocation ?? ""}
        />
      </div>
    </main>
  );
}
