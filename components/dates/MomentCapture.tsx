"use client";

import { useActionState, useEffect, useRef } from "react";
import { Camera, Send } from "lucide-react";
import { addMoment, type PlanState } from "@/app/dates/actions";
import { Button, Card } from "@/components/ui";

/**
 * The one control on a running date.
 *
 * Everything about this is shaped by where it gets used: standing outside a
 * restaurant, one-handed, half paying attention. So it's a single row — type
 * a line, or hit the camera, or both — and it clears itself on success so the
 * next one needs no tidying up.
 *
 * `capture="environment"` asks a phone for the rear camera directly, which
 * skips the gallery picker for the common case of photographing what's in
 * front of you.
 */
export default function MomentCapture({ planId }: { planId: string }) {
  const [state, formAction, pending] = useActionState<PlanState, FormData>(
    addMoment,
    {}
  );

  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Clear after a successful save. Checking `pending` as well as the absence
  // of an error avoids wiping the box on first render.
  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
  }, [pending, state.error]);

  return (
    <Card elevation="raised" className="p-space-md">
      <form ref={formRef} action={formAction} className="space-y-space-sm">
        <input type="hidden" name="plan_id" value={planId} />

        <div className="flex items-end gap-space-sm">
          <label className="flex-1">
            <span className="sr-only">Something worth keeping</span>
            <textarea
              name="note"
              rows={2}
              placeholder="Something worth keeping…"
              className="w-full resize-none rounded-lg border border-[var(--glass-rim)] bg-[rgb(255_255_255/0.05)] px-4 py-3 text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
            />
          </label>

          <label
            className="flex h-[52px] w-[52px] shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--glass-rim)] bg-[var(--glass-1)] text-on-surface-variant transition hover:bg-[var(--glass-2)] hover:text-on-surface has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
            title="Add a photo"
          >
            <Camera className="h-5 w-5" aria-hidden />
            <span className="sr-only">Add a photo</span>
            <input
              ref={fileRef}
              type="file"
              name="photo"
              accept="image/*,video/*"
              capture="environment"
              // Submits the moment the photo is taken. One tap instead of
              // two, and there is nothing else to decide.
              onChange={() => formRef.current?.requestSubmit()}
              className="sr-only"
            />
          </label>
        </div>

        {state.error && (
          <p role="alert" className="text-body-sm text-error">
            {state.error}
          </p>
        )}

        <Button type="submit" size="sm" variant="secondary" fullWidth disabled={pending}>
          <Send className="h-4 w-4" aria-hidden />
          {pending ? "Keeping it…" : "Keep this"}
        </Button>
      </form>
    </Card>
  );
}
