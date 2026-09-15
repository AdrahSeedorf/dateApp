"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteMemory } from "@/app/memories/actions";
import { Button, Card } from "@/components/ui";

type Props = {
  memoryId: string;
  partnerName: string | null;
};

/**
 * Deleting a whole memory.
 *
 * The confirmation says two true things that make the decision easier: it
 * comes back for thirty days, and the other person will notice. Both matter
 * — the first because these are photographs of a life, the second because a
 * shared vault means this isn't only your call to make.
 */
export default function DeleteMemory({ memoryId, partnerName }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <div className="mt-space-xl border-t border-[var(--glass-rim)] pt-space-lg">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 text-body-sm text-on-surface-variant transition hover:text-error"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
          Delete this memory
        </button>
      </div>
    );
  }

  return (
    <Card elevation="raised" className="mt-space-xl space-y-space-md p-space-lg">
      <p className="text-body-md text-on-surface leading-relaxed">
        This goes to <strong className="text-primary">Recently deleted</strong>{" "}
        and can be restored for 30 days. After that it&apos;s gone, photos and
        all.
      </p>

      <p className="text-body-sm text-on-surface-variant">
        {partnerName
          ? `${partnerName} will stop seeing it too — the vault is shared.`
          : "It disappears from the vault for both of you."}
      </p>

      <form action={deleteMemory} className="flex flex-col gap-space-sm sm:flex-row">
        <input type="hidden" name="id" value={memoryId} />

        <Button type="submit" variant="danger" className="flex-1">
          <Trash2 className="h-4 w-4" aria-hidden />
          Move to Recently deleted
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={() => setConfirming(false)}
          className="flex-1"
        >
          Keep it
        </Button>
      </form>
    </Card>
  );
}
