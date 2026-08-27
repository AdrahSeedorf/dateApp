import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MemoryForm from "@/components/MemoryForm";

export default async function NewMemoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("couple_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.couple_id) redirect("/home");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_center,#2d0f36,#050510_75%)] px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/memories"
          className="text-white/50 hover:text-white mb-8 inline-block"
        >
          ← Our memories
        </Link>

        <p className="tracking-[0.35em] text-xs text-pink-200 mb-3">
          NEW MEMORY
        </p>

        <h1 className="text-3xl md:text-4xl font-bold mb-8">
          Keep this one
        </h1>

        <MemoryForm coupleId={profile.couple_id} />
      </div>
    </main>
  );
}
