import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { getPartner } from "@/lib/couple";
import { earliestUnlockDate } from "@/lib/letters";
import ComposeForm from "@/components/letters/ComposeForm";
import { Button, Card, Screen, ScreenHeader } from "@/components/ui";

export const metadata = { title: "Write a letter" };

export default async function NewLetterPage() {
  const session = await requireOnboarded();
  const supabase = await createClient();

  const partner = await getPartner(supabase, session.userId, session.coupleId);

  const tomorrow = earliestUnlockDate();

  return (
    <Screen className="mx-auto max-w-2xl">
      <Link
        href="/letters"
        className="mt-space-lg inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
      >
        ← Letters
      </Link>

      <ScreenHeader
        eyebrow="Pen a keepsake"
        title={
          partner?.displayName ? (
            <>
              Something for <em>{partner.displayName}</em>
            </>
          ) : (
            "Write a letter"
          )
        }
        body="They won't be able to read a word of it until it opens."
      />

      {partner ? (
        <ComposeForm
          partnerName={partner.displayName ?? "them"}
          minUnlockDate={tomorrow}
        />
      ) : (
        // Rendering the form with nobody to send to would only end in an
        // error after they'd written something, which is a cruel place to
        // discover it.
        <Card className="p-space-xl text-center">
          <h2 className="mb-space-sm font-headline text-headline-sm text-on-surface">
            Nobody to write to yet
          </h2>
          <p className="mx-auto mb-space-lg max-w-sm text-body-md text-on-surface-variant leading-relaxed">
            A letter needs someone waiting at the other end. Invite your
            partner and this will be here when they arrive.
          </p>
          <Button href="/profile" size="sm" variant="secondary">
            Go to your profile
          </Button>
        </Card>
      )}
    </Screen>
  );
}
