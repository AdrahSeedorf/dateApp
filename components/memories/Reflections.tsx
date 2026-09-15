"use client";

import { useActionState, useState } from "react";
import { Lock, Trash2 } from "lucide-react";
import type { Reflection } from "@/lib/memories";
import {
  addReflection,
  deleteReflection,
  type ReflectionState,
} from "@/app/memories/actions";
import { Button, Card, CheckCard, Pill, TextArea } from "@/components/ui";

type Props = {
  memoryId: string;
  viewerId: string;
  partnerName: string | null;
  reflections: Reflection[];
};

function when(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Notes added to a memory later.
 *
 * Distinct from the memory's description, which is the shared account of what
 * happened. A reflection is what you thought about it afterwards — the detail
 * you only remembered a week later.
 *
 * Anything private here was filtered out by the database before it reached
 * this component, so a reflection in `reflections` is one this viewer is
 * entitled to. Nothing below decides that.
 */
export default function Reflections({
  memoryId,
  viewerId,
  partnerName,
  reflections,
}: Props) {
  const [state, formAction, pending] = useActionState<ReflectionState, FormData>(
    addReflection,
    {}
  );

  const [writing, setWriting] = useState(false);

  return (
    <section className="mt-space-xl">
      <h2 className="mb-space-md font-headline text-headline-sm text-on-surface">
        Reflections
      </h2>

      {reflections.length > 0 && (
        <ul className="mb-space-lg space-y-space-sm">
          {reflections.map((reflection) => {
            const mine = reflection.author_id === viewerId;

            return (
              <li key={reflection.id}>
                <Card elevation="flat" className="p-space-lg">
                  <div className="mb-space-xs flex items-center gap-space-sm">
                    <span className="text-label-sm text-on-surface-variant">
                      {mine ? "You" : (partnerName ?? "Them")} ·{" "}
                      {when(reflection.created_at)}
                    </span>

                    {reflection.is_private && (
                      <Pill>
                        <Lock className="h-3 w-3" aria-hidden />
                        Only you
                      </Pill>
                    )}
                  </div>

                  <p className="whitespace-pre-wrap text-body-md text-on-surface/90 leading-relaxed">
                    {reflection.body}
                  </p>

                  {mine && (
                    <form action={deleteReflection} className="mt-space-sm">
                      <input type="hidden" name="id" value={reflection.id} />
                      <input type="hidden" name="memory_id" value={memoryId} />
                      <button
                        type="submit"
                        className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant transition hover:text-error"
                      >
                        <Trash2 className="h-3 w-3" aria-hidden />
                        Remove
                      </button>
                    </form>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {writing ? (
        <Card className="p-space-lg">
          <form action={formAction} className="space-y-space-md">
            <input type="hidden" name="memory_id" value={memoryId} />

            <TextArea
              name="body"
              label="What you remember"
              rows={4}
              placeholder="The thing you didn't write down at the time."
              autoFocus
              required
            />

            <CheckCard
              name="is_private"
              label="Keep this to yourself"
              hint={
                partnerName
                  ? `${partnerName} won't see it, and won't be told it exists.`
                  : "Your partner won't see it, and won't be told it exists."
              }
            />

            {state.error && (
              <p role="alert" className="text-body-sm text-error">
                {state.error}
              </p>
            )}

            <div className="flex gap-space-sm">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Add it"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setWriting(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setWriting(true)}>
          Add a reflection
        </Button>
      )}
    </section>
  );
}
