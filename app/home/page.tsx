import Link from "next/link";

import { Calendar, Heart, Images, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";

function daysBetween(startedAt: string | null): number | null {
  if (!startedAt) return null;

  const start = new Date(startedAt);
  const today = new Date();

  const days = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );

  return Math.max(days, 0);
}

export default async function HomePage() {
  const session = await requireOnboarded();
  const supabase = await createClient();

  const profile = {
    display_name: session.displayName,
    couple_id: session.coupleId,
  };

  // Signed in but not attached to a couple yet.
  if (!profile?.couple_id) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_center,#2d0f36,#050510_75%)] px-6">
        <div className="max-w-md w-full text-center rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-8">
          <h1 className="text-2xl font-bold mb-4">Almost there</h1>
          <p className="text-white/60 leading-relaxed">
            Your account isn&apos;t linked to anyone yet. If you were sent an
            invite link, open that link to finish setting things up.
          </p>
        </div>
      </main>
    );
  }

  const { data: couple } = await supabase
    .from("couples")
    .select("name, started_at")
    .eq("id", profile.couple_id)
    .maybeSingle();

  const { count: memoryCount } = await supabase
    .from("memories")
    .select("id", { count: "exact", head: true });

  const { count: planCount } = await supabase
    .from("date_plans")
    .select("id", { count: "exact", head: true });

  const days = daysBetween(couple?.started_at ?? null);

  const stats: [string, string][] = [
    ["Together for", days === null ? "—" : `${days} days`],
    [
      "Since",
      couple?.started_at
        ? new Date(couple.started_at).toLocaleDateString()
        : "—",
    ],
    ["Memories kept", String(memoryCount ?? 0)],
    ["Dates planned", String(planCount ?? 0)],
  ];

  const cards = [
    {
      href: "/dates",
      icon: Sparkles,
      title: "Plan a date",
      subtitle: "Two real ideas for somewhere near you",
    },
    {
      href: "/memories",
      icon: Images,
      title: "Our memories",
      subtitle: "Everything worth keeping, in one place",
    },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_center,#2d0f36,#050510_75%)] px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <p className="tracking-[0.4em] text-xs text-pink-200">
            {couple?.name ? couple.name.toUpperCase() : "OUR JOURNEY"}
          </p>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-white/40 hover:text-white text-sm"
            >
              Sign out
            </button>
          </form>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold mb-3 flex items-center gap-4">
          <Heart className="w-10 h-10 text-pink-300" />
          {profile.display_name ? `Hey, ${profile.display_name}` : "Our Journey"}
        </h1>

        <p className="text-white/60 text-lg mb-12">
          The proposal was only the beginning.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map(([label, value]) => (
            <div
              key={label}
              className="rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-5 text-center"
            >
              <p className="text-white/40 text-xs tracking-[0.2em] mb-2">
                {label.toUpperCase()}
              </p>
              <p className="text-xl font-semibold text-pink-100">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-8 hover:border-pink-300/50 transition block"
            >
              <card.icon className="w-10 h-10 text-pink-300 mb-5" />
              <h2 className="text-2xl font-bold mb-2">{card.title}</h2>
              <p className="text-white/60">{card.subtitle}</p>
            </Link>
          ))}
        </div>

        {!couple?.started_at && (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-white/40 shrink-0" />
            <p className="text-white/50 text-sm">
              Set your start date to turn on the days counter.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
