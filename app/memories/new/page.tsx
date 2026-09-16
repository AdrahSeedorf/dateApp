import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import MemoryForm from "@/components/MemoryForm";
import { Screen, ScreenHeader } from "@/components/ui";

type Props = {
  searchParams: Promise<{ plan?: string }>;
};

export default async function NewMemoryPage({ searchParams }: Props) {
  const { plan: planId } = await searchParams;
  const session = await requireOnboarded();
  const supabase = await createClient();

  if (!session.coupleId) redirect("/home");

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
    <Screen className="mx-auto max-w-2xl">
      <Link
        href={planTitle ? "/dates" : "/memories"}
        className="mt-space-lg inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
      >
        ← {planTitle ? "Plan a date" : "Our memories"}
      </Link>

      <ScreenHeader
        eyebrow="New memory"
        title="Keep this one"
        body={
          planTitle ? (
            <>
              From your saved date:{" "}
              <span className="text-primary">{planTitle}</span>
            </>
          ) : undefined
        }
      />

      <MemoryForm
        coupleId={session.coupleId}
        userId={session.userId}
        datePlanId={planTitle ? (planId ?? null) : null}
        initialTitle={planTitle ?? ""}
        initialLocation={planLocation ?? ""}
      />
    </Screen>
  );
}
