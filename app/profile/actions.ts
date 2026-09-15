"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isStage, safeTheme } from "@/lib/coupleProfile";
import { isDistanceMode } from "@/lib/distance";
import { getSessionProfile } from "@/lib/auth";
import { ACCESS_NEEDS, type AccessNeeds } from "@/lib/accessNeeds";
import { ALL_INTERESTS, AVOID_OPTIONS, keepKnown } from "@/lib/interests";

export type SaveState = { error?: string; saved?: string };

const MAX_ITEMS = 12;
const MAX_ITEM_LENGTH = 40;
const MAX_NOTES = 500;

function parseList(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.slice(0, MAX_ITEM_LENGTH))
    .slice(0, MAX_ITEMS);
}

export async function saveAbout(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const name = String(formData.get("display_name") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();

  if (!name) return { error: "Enter a name." };
  if (name.length > 60) return { error: "Keep the name under 60 characters." };
  if (location.length > 120) {
    return { error: "Keep the location under 120 characters." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name, location: location || null })
    .eq("id", session.userId);

  if (error) {
    console.error("[profile] about save failed", error.message);
    return { error: "Couldn't save that. Try again." };
  }

  revalidatePath("/profile");
  return { saved: "Saved" };
}

export async function savePreferences(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const accessNeeds: AccessNeeds = {};

  for (const need of ACCESS_NEEDS) {
    if (formData.get(need.key) === "on") accessNeeds[need.key] = true;
  }

  const supabase = await createClient();

  const { error } = await supabase.from("profile_prefs").upsert(
    {
      profile_id: session.userId,
      interests: keepKnown(
        formData.getAll("interests").map(String),
        ALL_INTERESTS
      ).slice(0, MAX_ITEMS),
      want_to_try: parseList(formData.get("want_to_try")),
      avoid: keepKnown(
        formData.getAll("avoid").map(String),
        AVOID_OPTIONS
      ).slice(0, MAX_ITEMS),
      access_needs: accessNeeds,
      access_notes:
        String(formData.get("access_notes") ?? "").trim().slice(0, MAX_NOTES) ||
        null,
      share_access_with_partner:
        formData.get("share_access_with_partner") === "on",
    },
    { onConflict: "profile_id" }
  );

  if (error) {
    console.error("[profile] prefs save failed", error.message);
    return { error: "Couldn't save that. Try again." };
  }

  revalidatePath("/profile");
  return { saved: "Saved" };
}

/** Shared, so this writes for both people in the couple. */
export async function saveCouple(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");
  if (!session.coupleId) return { error: "You're not linked to anyone yet." };

  const name = String(formData.get("couple_name") ?? "").trim();
  const startedAt = String(formData.get("started_at") ?? "").trim();
  const stage = String(formData.get("stage") ?? "");
  const theme = safeTheme(formData.get("theme"));
  const rawMode = String(formData.get("distance_mode") ?? "");
  const reunionOn = String(formData.get("reunion_on") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();

  if (startedAt && !/^\d{4}-\d{2}-\d{2}$/.test(startedAt)) {
    return { error: "That date didn't make sense." };
  }

  if (reunionOn && !/^\d{4}-\d{2}-\d{2}$/.test(reunionOn)) {
    return { error: "That reunion date didn't make sense." };
  }

  const apart = rawMode === "apart";

  const supabase = await createClient();
  const { error } = await supabase
    .from("couples")
    .update({
      name: name || null,
      started_at: startedAt || null,
      stage: isStage(stage) ? stage : null,
      theme,
      // An unrecognised value means the radio was never touched, which is
      // "still unanswered" rather than "they live together".
      distance_mode: isDistanceMode(rawMode) ? rawMode : "auto",
      // Clearing the reunion date when they're together again is the point,
      // not an omission — a stale countdown to a trip that already happened
      // is worse than none.
      reunion_on: apart && reunionOn ? reunionOn : null,
    })
    .eq("id", session.coupleId);

  if (error) {
    console.error("[profile] couple save failed", error.message);
    return { error: "Couldn't save that. Try again." };
  }

  // Recorded on the person, not the couple: it's where *you* are.
  // Only written when there's something to write, so a browser that refuses
  // to report a zone doesn't wipe one saved earlier from another device.
  if (apart && timezone) {
    const { error: zoneError } = await supabase
      .from("profiles")
      .update({ timezone })
      .eq("id", session.userId);

    if (zoneError) {
      console.error("[profile] timezone save failed", zoneError.message);
    }
  }

  // The theme lives on <html>, which the root layout renders, so every route
  // has to be revalidated for a colour change to take effect everywhere.
  revalidatePath("/", "layout");
  return { saved: "Saved" };
}

/**
 * Starts an email change.
 *
 * Supabase doesn't switch the address immediately — it emails a confirmation
 * link, and with secure email change enabled (the default) it emails both
 * the old and new addresses and needs both confirmed. So this only ever
 * reports that something was sent, never that the address changed.
 */
export async function changeEmail(
  _prev: SaveState,
  formData: FormData
): Promise<SaveState> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  if (email === session.email?.toLowerCase()) {
    return { error: "That's already your address." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    console.error("[profile] email change failed", error.message);
    return { error: error.message };
  }

  return {
    saved: "Check both inboxes — the change needs confirming from each address.",
  };
}
