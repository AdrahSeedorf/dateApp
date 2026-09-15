import Link from "next/link";
import { PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { getPartner } from "@/lib/couple";
import { isUnlockable, listLetters } from "@/lib/letters";
import LetterCard from "@/components/letters/LetterCard";
import { Button, Card, Screen, ScreenHeader, Section } from "@/components/ui";

export const metadata = { title: "Letters" };

export default async function LettersPage() {
  const session = await requireOnboarded();
  const supabase = await createClient();

  const partner = await getPartner(supabase, session.userId, session.coupleId);
  const { letters, error } = await listLetters(supabase);

  // Grouped rather than filtered by tab: the whole point of the feature is
  // that something is waiting, and a tab would hide it behind a click.
  const ready = letters.filter(
    (l) => isUnlockable(l) && l.recipient_id === session.userId
  );
  const readyIds = new Set(ready.map((l) => l.id));

  const waiting = letters.filter(
    (l) => l.status === "sealed" && !readyIds.has(l.id)
  );
  const opened = letters.filter((l) => l.status === "opened");
  const drafts = letters.filter((l) => l.status === "draft");

  const partnerName = partner?.displayName ?? null;

  return (
    <Screen withNav className="mx-auto max-w-2xl">
      <Link
        href="/home"
        className="mt-space-lg inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
      >
        ← Our Journey
      </Link>

      <ScreenHeader
        eyebrow="Time vault"
        title={
          <>
            Letters, <em>kept for later</em>
          </>
        }
        body="Words written now and read when they'll land hardest."
        action={
          <Button href="/letters/new" size="sm">
            <PenLine className="h-4 w-4" aria-hidden />
            Write
          </Button>
        }
      />

      {error && (
        <p role="alert" className="mb-space-lg text-body-sm text-error">
          {error}
        </p>
      )}

      {!partner && (
        <Card elevation="flat" className="mb-space-lg p-space-lg">
          <p className="text-body-md text-on-surface-variant leading-relaxed">
            Letters need someone to write to. Once{" "}
            <Link href="/profile" className="text-primary hover:underline">
              your partner joins
            </Link>
            , you can start leaving things for them to find.
          </p>
        </Card>
      )}

      {letters.length === 0 && partner && (
        <Card className="p-12 text-center">
          <h2 className="font-headline text-headline-sm text-on-surface mb-space-sm">
            Nothing sealed yet
          </h2>
          <p className="mx-auto mb-space-xl max-w-sm text-body-md text-on-surface-variant leading-relaxed">
            Write something for a date that hasn&apos;t happened yet — an
            anniversary, or just a day they might need it.
          </p>
          <Button href="/letters/new" size="sm">
            Write the first one
          </Button>
        </Card>
      )}

      {ready.length > 0 && (
        <Section title="Ready for you">
          <div className="space-y-space-sm">
            {ready.map((letter) => (
              <LetterCard
                key={letter.id}
                letter={letter}
                viewerId={session.userId}
                partnerName={partnerName}
              />
            ))}
          </div>
        </Section>
      )}

      {waiting.length > 0 && (
        <Section title="Still sealed">
          <div className="space-y-space-sm">
            {waiting.map((letter) => (
              <LetterCard
                key={letter.id}
                letter={letter}
                viewerId={session.userId}
                partnerName={partnerName}
              />
            ))}
          </div>
        </Section>
      )}

      {opened.length > 0 && (
        <Section title="Opened">
          <div className="space-y-space-sm">
            {opened.map((letter) => (
              <LetterCard
                key={letter.id}
                letter={letter}
                viewerId={session.userId}
                partnerName={partnerName}
              />
            ))}
          </div>
        </Section>
      )}

      {drafts.length > 0 && (
        <Section title="Drafts">
          <div className="space-y-space-sm">
            {drafts.map((letter) => (
              <LetterCard
                key={letter.id}
                letter={letter}
                viewerId={session.userId}
                partnerName={partnerName}
              />
            ))}
          </div>
        </Section>
      )}
    </Screen>
  );
}
