"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/home";

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
    <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_center,#2d0f36,#050510_75%)] px-6">
      <div className="max-w-md w-full rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-8">
        <p className="tracking-[0.35em] text-xs text-pink-200 mb-4">
          SIGN IN
        </p>

        <h1 className="text-3xl font-bold mb-6">Welcome back</h1>

        {status === "sent" ? (
          <div className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-6 text-center">
            <p className="text-emerald-100 mb-2 font-semibold">
              Check your email
            </p>
            <p className="text-white/60 text-sm">
              We sent a sign-in link to {email}. Open it on this device.
            </p>
          </div>
        ) : (
          <form onSubmit={sendMagicLink}>
            <label
              htmlFor="email"
              className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
            >
              EMAIL
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-5 py-3 mb-5 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30"
            />

            {status === "error" && (
              <p className="text-pink-200 text-sm mb-5">{errorMessage}</p>
            )}

            <button
              type="submit"
              disabled={status === "sending" || !email.trim()}
              className="w-full px-6 py-4 rounded-full bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-white/40 transition font-semibold"
            >
              {status === "sending" ? "Sending..." : "Email me a sign-in link"}
            </button>

            <p className="text-white/30 text-xs mt-6 text-center">
              No password. We&apos;ll email you a link that signs you in.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
