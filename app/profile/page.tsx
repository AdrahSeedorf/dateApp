import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { parseAccessNeeds } from "@/lib/accessNeeds";
import PrefsFields, { type PrefsValues } from "@/components/prefs/PrefsFields";
import SaveableForm from "@/components/profile/SaveableForm";
import { Field, Screen, ScreenHeader } from "@/components/ui";
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
    <Screen className="mx-auto max-w-3xl">
      <Link
        href="/home"
        className="mt-space-lg inline-block text-body-sm text-on-surface-variant transition hover:text-on-surface"
      >
        ← Our Journey
      </Link>

      <ScreenHeader
        eyebrow="Your profile"
        title={session.displayName ?? "You"}
      />

        <SaveableForm action={saveAbout} title="About you">
          <div className="grid gap-space-md sm:grid-cols-2">
            <Field
              id="display_name"
              name="display_name"
              label="Name"
              defaultValue={session.displayName ?? ""}
            />

            <Field
              id="location"
              name="location"
              label="Town or suburb"
              defaultValue={session.location ?? ""}
              placeholder="Penrith, NSW"
            />
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
            <div className="grid gap-space-md sm:grid-cols-2">
              <Field
                id="couple_name"
                name="couple_name"
                label="What to call yourselves"
                defaultValue={couple?.name ?? ""}
                placeholder="Us"
              />

              <Field
                id="started_at"
                name="started_at"
                type="date"
                label="Together since"
                defaultValue={couple?.started_at ?? ""}
                hint="Turns on the days counter. Leave empty until it's real."
              />
            </div>
          </SaveableForm>
        )}

        <SaveableForm
          action={changeEmail}
          title="Signing in"
          description="You sign in with a link sent to this address."
          submitLabel="Change email"
        >
          <Field
            id="email"
            name="email"
            type="email"
            label="Email"
            defaultValue={session.email ?? ""}
            hint="Changing this needs confirming from both the old and new address before it takes effect."
          />
        </SaveableForm>

      <form action="/auth/signout" method="post" className="mt-space-xl">
        <button
          type="submit"
          className="text-body-sm text-on-surface-variant transition hover:text-on-surface"
        >
          Sign out
        </button>
      </form>
    </Screen>
  );
}
