"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { NUDGE_KINDS, nudgeMeta, type Nudge } from "@/lib/nudges";
import {
  dismissNudge,
  sendNudge,
  type NudgeState,
} from "@/app/home/nudge-actions";
import { Button, Card, cn } from "@/components/ui";
import NudgeBurst from "./NudgeBurst";

type Props = {
  partnerName: string;
  /** The most recent nudge either way, or null if there's never been one. */
  latest: Nudge | null;
  viewerId: string;
  /** Rendered on the server so the clock isn't read during render. */
  agoLabel: string | null;
};

/**
 * One tap that says "thinking of you", and one tap back.
 *
 * Three states: something waiting for you, something you sent, or nothing
 * yet. The first is the only one that gets any visual weight — the others
 * shouldn't nag.
 */
export default function NudgeCard({
  partnerName,
  latest,
  viewerId,
  agoLabel,
}: Props) {
  const [state, formAction, pending] = useActionState<NudgeState, FormData>(
    sendNudge,
    {}
  );

  const [picking, setPicking] = useState(false);

  const waiting = latest && latest.to_id === viewerId;
  const meta = latest ? nudgeMeta(latest.kind) : null;

  /**
   * The burst plays when a nudge *arrives*, not when one is on screen.
   *
   * The distinction matters because this card re-renders on every dashboard
   * load and after every server action. Bursting on render would mean
   * celebrating a three-day-old nudge every time you open the app.
   */
  const latestId = latest?.id ?? null;
  const seen = useRef<string | null | undefined>(undefined);
  const [burst, setBurst] = useState<string | null>(null);

  useEffect(() => {
    // The first pass only establishes a baseline: whatever was already
    // there when the page loaded is not news.
    if (seen.current === undefined) {
      seen.current = latestId;
      return;
    }

    if (!latestId || latestId === seen.current) return;

    seen.current = latestId;
    setBurst(latestId);

    // Cleared once it's done so nothing invisible is left in the tree.
    const timer = setTimeout(() => setBurst(null), 700);
    return () => clearTimeout(timer);
  }, [latestId]);

  return (
    <Card
      elevation={waiting ? "raised" : "flat"}
      className={cn("mb-space-lg p-space-lg", waiting && "border-primary/40")}
    >
      <div className="flex items-center gap-space-md">
        {meta && <NudgeBurst trigger={burst} emoji={meta.emoji} />}

        <div className="min-w-0 flex-1">
          {waiting && meta ? (
            <>
              <p className="text-body-md text-on-surface">
                {partnerName} {meta.received}
              </p>
              <p className="text-label-sm text-on-surface-variant">
                {agoLabel}
              </p>
            </>
          ) : latest && meta ? (
            <>
              <p className="text-body-md text-on-surface-variant">
                You sent {partnerName} {meta.label.toLowerCase()}
              </p>
              <p className="text-label-sm text-on-surface-variant">
                {agoLabel}
                {/* No push notifications exist, so this is the honest
                    description of what happens next. */}
                {!latest.seen_at && " · they'll see it next time they're here"}
              </p>
            </>
          ) : (
            <p className="text-body-md text-on-surface-variant">
              Send {partnerName} something small.
            </p>
          )}
        </div>

        {!picking && (
          <Button
            size="sm"
            variant={waiting ? "primary" : "secondary"}
            onClick={() => setPicking(true)}
            className="shrink-0"
          >
            {waiting ? "Echo" : "Send"}
          </Button>
        )}
      </div>

      {picking && (
        <form action={formAction} className="mt-space-md">
          {waiting && latest && (
            <input type="hidden" name="reply_to" value={latest.id} />
          )}

          <fieldset className="border-0 p-0 m-0">
            <legend className="sr-only">Pick something to send</legend>

            <div className="flex flex-wrap gap-space-sm">
              {NUDGE_KINDS.map((kind) => (
                <button
                  key={kind.key}
                  type="submit"
                  name="kind"
                  value={kind.key}
                  disabled={pending}
                  className="flex min-h-[44px] items-center gap-2 rounded-full border border-[var(--glass-rim)] bg-[var(--glass-1)] px-4 text-label-md text-on-surface-variant transition hover:bg-[var(--glass-2)] hover:text-on-surface disabled:opacity-50"
                >
                  <span aria-hidden>{kind.emoji}</span>
                  {kind.label}
                </button>
              ))}
            </div>
          </fieldset>

          {state.error && (
            <p role="alert" className="mt-space-sm text-body-sm text-error">
              {state.error}
            </p>
          )}
        </form>
      )}

      {/* Acknowledging without replying matters: not every gesture wants a
          gesture back, and leaving it sitting there would make it a debt. */}
      {waiting && latest && !picking && (
        <form action={dismissNudge} className="mt-space-sm">
          <input type="hidden" name="id" value={latest.id} />
          <button
            type="submit"
            className="text-label-sm text-on-surface-variant transition hover:text-on-surface"
          >
            Just acknowledge it
          </button>
        </form>
      )}
    </Card>
  );
}
