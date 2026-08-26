import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Already signed in — go straight to the dashboard.
  if (user) {
    redirect("/home");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_center,#2d0f36,#050510_75%)] px-6">
      <div className="max-w-lg w-full text-center rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-10">
        <p className="tracking-[0.4em] text-xs text-pink-200 mb-6">
          HIDDEN TRUTHS
        </p>

        <h1 className="text-4xl md:text-5xl font-bold mb-5">
          Plan dates. Keep the memories.
        </h1>

        <p className="text-white/60 mb-10 leading-relaxed">
          Somewhere to decide what to do together — and somewhere for it to
          live afterwards.
        </p>

        <Link
          href="/login"
          className="inline-block px-8 py-4 rounded-full bg-pink-500 hover:bg-pink-400 transition font-semibold"
        >
          Sign in
        </Link>

        <p className="text-white/30 text-xs mt-8">
          Invite only for now.
        </p>
      </div>
    </main>
  );
}
