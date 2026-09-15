"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button, Field } from "@/components/ui";
import { createPartnerInvite, type InviteState } from "@/app/welcome/invite-actions";

type Props = {
  onDone: () => Promise<void>;
};

export default function InviteStep({ onDone }: Props) {
  const [state, formAction, pending] = useActionState<
    InviteState | undefined,
    FormData
  >(createPartnerInvite, undefined);

  const [copied, setCopied] = useState(false);
  const [advancing, startTransition] = useTransition();

  const link = state?.ok ? state.link : null;

  async function copy() {
    if (!link) return;

    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the link is on screen to copy by hand.
    }
  }

  async function share() {
    if (!link) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Hidden Truths",
          text: "I made us something.",
          url: link,
        });
        return;
      } catch {
        // Cancelled — fall through to copying.
      }
    }

    await copy();
  }

  function finish() {
    startTransition(async () => {
      await onDone();
    });
  }

  if (link) {
    return (
      <div className="space-y-space-md">
        <div className="rounded-lg border border-primary/30 bg-[rgb(var(--c-glow-a)/0.08)] p-space-lg">
          <p className="text-label-sm text-on-surface-variant tracking-[0.15em] mb-space-xs">
            THEIR LINK
          </p>

          <p className="font-mono text-body-sm text-primary break-all leading-relaxed">
            {link}
          </p>
        </div>

        {state?.ok && state.reused && (
          <p className="text-body-sm text-on-surface-variant">
            You already had an invite open, so this is that same link.
          </p>
        )}

        <div className="flex gap-space-sm">
          <Button size="sm" onClick={share} className="flex-1">
            <Share2 className="h-4 w-4" aria-hidden />
            Send it
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={copy}
            className="flex-1"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden />
                Copy
              </>
            )}
          </Button>
        </div>

        <p className="text-body-sm text-on-surface-variant/80">
          Opening this signs them straight in, so treat it like a password. It
          only works once.
        </p>

        <Button
          variant="secondary"
          fullWidth
          onClick={finish}
          disabled={advancing}
        >
          Continue
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-space-md">
      <Field
        id="email"
        name="email"
        type="email"
        label="Their email"
        placeholder="them@example.com"
        autoComplete="off"
      />

      <Field
        id="displayName"
        name="displayName"
        label="Their name"
        placeholder="Karina"
        autoComplete="off"
        error={state && !state.ok ? state.error : undefined}
      />

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? "Making the link…" : "Make their link"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        fullWidth
        onClick={finish}
        disabled={advancing}
      >
        I&apos;ll invite them later
      </Button>
    </form>
  );
}
