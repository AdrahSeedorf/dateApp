"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Field, Screen } from "@/components/ui";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/home";
  // Set when an invite/magic-link redemption bounced back here.
  const inboundError = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");

  async function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();

    if (!email.trim()) return;

    setStatus("sending");
    setErrorMessage("");

    const supabase = createClient();
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
        // Invite-only: don't let a magic link silently create new accounts.
        shouldCreateUser: false,
      },
    });

    if (error) {
      setErrorMessage(error.message);
      setStatus("error");
      return;
    }

    setStatus("sent");
  }

  return (
    <Screen className="flex min-h-screen items-center justify-center">
      <Card className="w-full max-w-md">
        <p className="text-label-sm text-primary tracking-[0.35em] mb-space-sm">
          SIGN IN
        </p>

        <h1 className="font-headline text-headline-lg text-on-surface mb-space-lg">
          Welcome back
        </h1>

        {inboundError && (
          // role="alert" so it's announced — someone arriving here from a
          // dead invite link needs to hear why, not just see it.
          <div
            role="alert"
            className="rounded-lg border border-error/30 bg-error-container/40 p-space-md mb-space-lg"
          >
            <p className="text-label-lg text-on-error-container mb-1">
              That sign-in link didn&apos;t work
            </p>
            <p className="text-body-sm text-on-error-container/80 break-words">
              {inboundError}
            </p>
          </div>
        )}

        {status === "sent" ? (
          <div
            role="status"
            className="rounded-lg border border-[var(--glass-rim-strong)] bg-[rgb(var(--c-glow-c)/0.12)] p-space-lg text-center"
          >
            <p className="text-title-md text-tertiary mb-space-xs">
              Check your email
            </p>
            <p className="text-body-sm text-on-surface-variant">
              We sent a sign-in link to {email}. Open it on this device.
            </p>
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-space-md">
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              error={status === "error" ? errorMessage : undefined}
            />

            <Button
              type="submit"
              fullWidth
              disabled={status === "sending" || !email.trim()}
            >
              {status === "sending" ? "Sending…" : "Email me a sign-in link"}
            </Button>

            <p className="text-body-sm text-on-surface-variant/70 text-center">
              No password. We&apos;ll email you a link that signs you in.
            </p>
          </form>
        )}
      </Card>
    </Screen>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
