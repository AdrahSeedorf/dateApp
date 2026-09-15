import Link from "next/link";
import { Lock, LockOpen, Mail, PenLine } from "lucide-react";
import {
  isUnlockable,
  sealClassName,
  sealedSummary,
  type Letter,
} from "@/lib/letters";
import { Card, Pill, cn } from "@/components/ui";

type Props = {
  letter: Letter;
  viewerId: string;
  /** For "From Ana" / "To Ben". Null when nobody has joined yet. */
  partnerName: string | null;
};

/**
 * A letter as it appears in the vault.
 *
 * Shows the title, who it's between, and how far off it is. Never the body —
 * this component is never given one. That isn't a precaution so much as a
 * consequence: `Letter` has no body field, so there's nothing here to leak
 * even by accident.
 */
export default function LetterCard({ letter, viewerId, partnerName }: Props) {
  const viewerIsAuthor = letter.author_id === viewerId;
  const ready = isUnlockable(letter) && !viewerIsAuthor;
  const other = partnerName ?? "them";

  const Icon =
    letter.status === "draft"
      ? PenLine
      : letter.status === "opened"
        ? Mail
        : ready
          ? LockOpen
          : Lock;

  return (
    <Card
      as={Link}
      href={`/letters/${letter.id}`}
      elevation="flat"
      interactive
      className={cn(
        "flex items-start gap-space-md p-space-lg transition hover:border-primary/50",
        ready && "border-primary/40"
      )}
    >
      {/* The wax seal. Decorative — everything it signals is also in text. */}
      <span
        aria-hidden
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
          sealClassName(letter.seal),
          letter.status === "opened" && "opacity-50"
        )}
      >
        <Icon size={18} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="mb-1 flex flex-wrap items-center gap-space-sm">
          <span className="font-headline text-headline-sm text-on-surface">
            {letter.title}
          </span>

          {ready && <Pill tone="primary">Ready</Pill>}
          {letter.status === "draft" && <Pill>Draft</Pill>}
        </span>

        <span className="block text-body-sm text-on-surface-variant">
          {viewerIsAuthor ? `To ${other}` : `From ${other}`}
          {" · "}
          {sealedSummary(letter, viewerIsAuthor)}
        </span>

        {letter.teaser && letter.status !== "opened" && (
          <span className="mt-space-sm block font-headline italic text-body-md text-on-surface-variant/90">
            “{letter.teaser}”
          </span>
        )}
      </span>
    </Card>
  );
}
