import Link from "next/link";

import { Calendar, Heart, Images, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { Card, Screen } from "@/components/ui";

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
      <Screen className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md text-center">
          <h1 className="font-headline text-headline-md text-on-surface mb-space-md">
            Almost there
          </h1>
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            Your account isn&apos;t linked to anyone yet. If you were sent an
            invite link, open that link to finish setting things up.
          </p>
        </Card>
      </Screen>
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
    <Screen className="mx-auto max-w-5xl">
      <div className="mt-space-lg mb-space-xl flex items-center justify-between">
        <p className="text-label-sm text-primary tracking-[0.4em]">
          {couple?.name ? couple.name.toUpperCase() : "OUR JOURNEY"}
        </p>

        <Link
          href="/profile"
          className="text-body-sm text-on-surface-variant transition hover:text-on-surface"
        >
          Profile
        </Link>
      </div>

      <h1 className="mb-space-sm flex items-center gap-space-md font-headline text-display-lg-mobile md:text-display-lg text-on-surface">
        <Heart className="h-10 w-10 shrink-0 text-primary" aria-hidden />
        {profile.display_name ? (
          <>
            Hey, <em>{profile.display_name}</em>
          </>
        ) : (
          "Our Journey"
        )}
      </h1>

      <p className="mb-space-xl text-body-lg text-on-surface-variant">
        The proposal was only the beginning.
      </p>

      <div className="mb-space-xl grid grid-cols-2 gap-space-md md:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label} elevation="flat" className="p-space-lg text-center">
            <p className="mb-space-xs text-label-sm text-on-surface-variant tracking-[0.2em]">
              {label.toUpperCase()}
            </p>
            <p className="font-headline text-headline-sm text-primary">
              {value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-space-lg md:grid-cols-2">
        {cards.map((card) => (
          <Card
            key={card.href}
            as={Link}
            href={card.href}
            interactive
            className="block p-8 transition hover:border-primary/50"
          >
            <card.icon className="mb-space-md h-10 w-10 text-primary" aria-hidden />
            <h2 className="mb-space-xs font-headline text-headline-sm text-on-surface">
              {card.title}
            </h2>
            <p className="text-body-md text-on-surface-variant">
              {card.subtitle}
            </p>
          </Card>
        ))}
      </div>

      {!couple?.started_at && (
        <Card
          as={Link}
          href="/profile"
          elevation="flat"
          className="mt-space-xl flex items-center gap-space-sm p-space-lg transition hover:border-primary/50"
        >
          <Calendar
            className="h-5 w-5 shrink-0 text-on-surface-variant"
            aria-hidden
          />
          <p className="text-body-sm text-on-surface-variant">
            Set your start date to turn on the days counter.
          </p>
        </Card>
      )}
    </Screen>
  );
}
