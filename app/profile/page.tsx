import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { parseAccessNeeds } from "@/lib/accessNeeds";
import PrefsFields, { type PrefsValues } from "@/components/prefs/PrefsFields";
import SaveableForm from "@/components/profile/SaveableForm";
import {
  changeEmail,
  saveAbout,
  saveCouple,
  savePreferences,
} from "./actions";

export default async function ProfilePage() {
  const session = await requireOnboarded();
  const supabase = await createClient();

  const { data: prefs } = await supabase
    .from("profile_prefs")
    .select(
      "interests, want_to_try, avoid, access_needs, access_notes, share_access_with_partner"
    )
    .eq("profile_id", session.userId)
    .maybeSingle();

  const values: PrefsValues = {
    interests: prefs?.interests ?? [],
    wantToTry: prefs?.want_to_try ?? [],
    avoid: prefs?.avoid ?? [],
    accessNeeds: parseAccessNeeds(prefs?.access_needs),
    accessNotes: prefs?.access_notes ?? "",
    shareAccessWithPartner: prefs?.share_access_with_partner ?? false,
  };

  const { data: couple } = session.coupleId
    ? await supabase
        .from("couples")
        .select("name, started_at")
        .eq("id", session.coupleId)
        .maybeSingle()
    : { data: null };

  const { data: partner } = session.coupleId
    ? await supabase
        .from("profiles")
        .select("display_name")
        .eq("couple_id", session.coupleId)
        .neq("id", session.userId)
        .maybeSingle()
    : { data: null };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_center,#2d0f36,#050510_75%)] px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/home"
          className="text-white/50 hover:text-white mb-8 inline-block"
        >
          ← Our Journey
        </Link>

        <p className="tracking-[0.35em] text-xs text-pink-200 mb-3">
          YOUR PROFILE
        </p>

        <h1 className="text-3xl md:text-5xl font-bold mb-10">
          {session.displayName ?? "You"}
        </h1>

        <SaveableForm action={saveAbout} title="About you">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="display_name"
                className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
              >
                NAME
              </label>
              <input
                id="display_name"
                name="display_name"
                defaultValue={session.displayName ?? ""}
                className="w-full px-5 py-3 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white"
              />
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
              >
                TOWN OR SUBURB
              </label>
              <input
                id="location"
                name="location"
                defaultValue={session.location ?? ""}
                placeholder="Penrith, NSW"
                className="w-full px-5 py-3 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30"
              />
            </div>
          </div>
        </SaveableForm>

        <SaveableForm
          action={savePreferences}
          title="What you're into"
          description="This shapes the date ideas you get."
        >
          <PrefsFields values={values} />
        </SaveableForm>

        {session.coupleId && (
          <SaveableForm
            action={saveCouple}
            title="The two of you"
            description={
              partner?.display_name
                ? `Shared with ${partner.display_name} — changes here show for both of you.`
                : "Nobody else has joined yet. Changes here will show for them when they do."
            }
          >
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="couple_name"
                  className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
                >
                  WHAT TO CALL YOURSELVES
                </label>
                <input
                  id="couple_name"
                  name="couple_name"
                  defaultValue={couple?.name ?? ""}
                  placeholder="Us"
                  className="w-full px-5 py-3 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30"
                />
              </div>

              <div>
                <label
                  htmlFor="started_at"
                  className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
                >
                  TOGETHER SINCE
                </label>
                <input
                  id="started_at"
                  name="started_at"
                  type="date"
                  defaultValue={couple?.started_at ?? ""}
                  className="w-full px-5 py-3 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white"
                />
                <p className="text-white/30 text-xs mt-2">
                  Turns on the days counter. Leave empty until it&apos;s real.
                </p>
              </div>
            </div>
          </SaveableForm>
        )}

        <SaveableForm
          action={changeEmail}
          title="Signing in"
          description="You sign in with a link sent to this address."
          submitLabel="Change email"
        >
          <label
            htmlFor="email"
            className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
          >
            EMAIL
          </label>

          <input
            id="email"
            name="email"
            type="email"
            defaultValue={session.email ?? ""}
            className="w-full px-5 py-3 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white"
          />

          <p className="text-white/30 text-xs mt-2">
            Changing this needs confirming from both the old and new address
            before it takes effect.
          </p>
        </SaveableForm>

        <form action="/auth/signout" method="post" className="mt-10">
          <button
            type="submit"
            className="text-white/40 hover:text-white text-sm"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
