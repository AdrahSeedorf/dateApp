"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Copy, Share2 } from "lucide-react";
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
      <div>
        <div className="rounded-2xl border border-pink-300/30 bg-pink-500/5 p-5 mb-5">
          <p className="text-white/50 text-xs tracking-[0.15em] mb-2">
            THEIR LINK
          </p>

          <p className="text-pink-100 text-sm break-all font-mono leading-relaxed">
            {link}
          </p>
        </div>

        {state?.ok && state.reused && (
          <p className="text-white/40 text-xs mb-5">
            You already had an invite open, so this is that same link.
          </p>
        )}

        <div className="flex gap-3 mb-5">
          <button
            onClick={share}
            className="flex-1 px-5 py-3 rounded-full bg-pink-500 hover:bg-pink-400 transition text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" aria-hidden />
            Send it
          </button>

          <button
            onClick={copy}
            className="flex-1 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 transition text-sm flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" aria-hidden />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" aria-hidden />
                Copy
              </>
            )}
          </button>
        </div>

        <p className="text-white/30 text-xs mb-6">
          Opening this signs them straight in, so treat it like a password.
          It only works once.
        </p>

        <button
          onClick={finish}
          disabled={advancing}
          className="w-full px-6 py-4 rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-50 transition font-semibold"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <label
        htmlFor="email"
        className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
      >
        THEIR EMAIL
      </label>

      <input
        id="email"
        name="email"
        type="email"
        placeholder="them@example.com"
        autoComplete="off"
        className="w-full px-5 py-3 mb-4 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30"
      />

      <label
        htmlFor="displayName"
        className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
      >
        THEIR NAME
      </label>

      <input
        id="displayName"
        name="displayName"
        placeholder="Karina"
        autoComplete="off"
        className="w-full px-5 py-3 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30"
      />

      {state && !state.ok && (
        <p className="text-pink-200 text-sm mt-3">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full mt-6 px-6 py-4 rounded-full bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-white/40 transition font-semibold"
      >
        {pending ? "Making the link..." : "Make their link"}
      </button>

      <button
        type="button"
        onClick={finish}
        disabled={advancing}
        className="w-full mt-3 px-6 py-3 rounded-full text-white/40 hover:text-white/70 transition text-sm"
      >
        I&apos;ll invite them later
      </button>
    </form>
  );
}
