import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { getPartner } from "@/lib/couple";
import {
  daysUntilUnlock,
  getLetter,
  isUnlockable,
  sealClassName,
  sealedSummary,
} from "@/lib/letters";
import UnsealButton from "@/components/letters/UnsealButton";
import { deleteDraft } from "../actions";
import { Button, Card, Pill, Screen, cn } from "@/components/ui";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ just?: string }>;
};

function formatDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function LetterPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { just } = await searchParams;

  const session = await requireOnboarded();
  const supabase = await createClient();

  const letter = await getLetter(supabase, id);

  // RLS means another couple's letter simply isn't there, so this doubles
  // as the authorisation check.
  if (!letter) notFound();

  const partner = await getPartner(supabase, session.userId, session.coupleId);
  const other = partner?.displayName ?? "them";

  const viewerIsAuthor = letter.author_id === session.userId;
  const ready = isUnlockable(letter) && !viewerIsAuthor;
  const days = daysUntilUnlock(letter);

  return (
    <Screen className="mx-auto max-w-2xl">
      <Link
        href="/letters"
        className="mt-space-lg mb-space-xl inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
      >
        ← Letters
      </Link>

      {just === "sealed" && (
        <Card
          elevation="raised"
          className="mb-space-lg p-space-lg text-center"
          // role=status rather than alert: good news, announced politely.
        >
          <p role="status" className="text-body-md text-on-surface">
            Sealed. {other} can see it&apos;s waiting, but not a word of it
            until it opens.
          </p>
        </Card>
      )}

      <div className="mb-space-lg flex items-start gap-space-md">
        <span
          aria-hidden
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-full",
            sealClassName(letter.seal),
            letter.status === "opened" && "opacity-50"
          )}
        >
          <Lock size={22} />
        </span>

        <div className="min-w-0">
          <h1 className="font-headline text-headline-lg text-on-surface text-balance">
            {letter.title}
          </h1>

          <p className="mt-space-xs text-body-sm text-on-surface-variant">
            {viewerIsAuthor ? `To ${other}` : `From ${other}`}
            {" · "}
            {sealedSummary(letter, viewerIsAuthor)}
          </p>
        </div>
      </div>

      {letter.teaser && letter.status !== "opened" && (
        <p className="mb-space-lg font-headline italic text-body-lg text-on-surface-variant">
          “{letter.teaser}”
        </p>
      )}

      {/*
        The body renders only when it's actually here. `body` is null for a
        sealed letter because the database refused to return it — there is no
        branch below that could print one it wasn't given.
      */}
      {letter.body !== null ? (
        <Card className="p-8">
          {just === "opened" && (
            <Pill tone="primary" className="mb-space-md">
              Opened just now
            </Pill>
          )}

          <p className="whitespace-pre-wrap text-body-lg text-on-surface/90 leading-relaxed">
            {letter.body}
          </p>

          {letter.status === "opened" && viewerIsAuthor && letter.opened_at && (
            <p className="mt-space-lg border-t border-[var(--glass-rim)] pt-space-md text-body-sm text-on-surface-variant">
              {other} opened this on {formatDate(letter.opened_at)}.
            </p>
          )}
        </Card>
      ) : (
        <Card className="p-space-xl text-center">
          <h2 className="mb-space-sm font-headline text-headline-sm text-on-surface">
            {ready ? "It's ready" : "Still sealed"}
          </h2>

          <p className="mx-auto mb-space-lg max-w-sm text-body-md text-on-surface-variant leading-relaxed">
            {ready
              ? letter.unlock_trigger === "on_request"
                ? `${other} left this for a day you might need it. There's no rush — it keeps.`
                : "The day has come. Take a moment before you open it."
              : letter.unlock_trigger === "on_request"
                ? `${other} left this for a hard day. It'll be here whenever that is.`
                : days === null
                  ? "This one isn't ready yet."
                  : `Opens ${formatDate(letter.unlock_at)} — ${days} ${
                      days === 1 ? "day" : "days"
                    } from now.`}
          </p>

          {ready && (
            <UnsealButton
              letterId={letter.id}
              onRequest={letter.unlock_trigger === "on_request"}
            />
          )}
        </Card>
      )}

      {/* Only drafts can be deleted, and the database enforces that too. */}
      {letter.status === "draft" && viewerIsAuthor && (
        <form action={deleteDraft} className="mt-space-lg">
          <input type="hidden" name="id" value={letter.id} />
          <Button type="submit" variant="danger" size="sm">
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete this draft
          </Button>
        </form>
      )}
    </Screen>
  );
}
