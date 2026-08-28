"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { ACCESS_NEEDS, type AccessNeeds } from "@/lib/accessNeeds";
import { advanceStep } from "./actions";

export type PrefsState = { error?: string };

const MAX_ITEMS = 12;
const MAX_ITEM_LENGTH = 40;
const MAX_NOTES = 500;

/** "pizza, long walks, , live music" -> ["pizza", "long walks", "live music"] */
function parseList(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.slice(0, MAX_ITEM_LENGTH))
    .slice(0, MAX_ITEMS);
}

export async function savePrefs(
  _prev: PrefsState,
  formData: FormData
): Promise<PrefsState> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const accessNeeds: AccessNeeds = {};

  for (const need of ACCESS_NEEDS) {
    if (formData.get(need.key) === "on") {
      accessNeeds[need.key] = true;
    }
  }

  const notes = String(formData.get("access_notes") ?? "")
    .trim()
    .slice(0, MAX_NOTES);

  const supabase = await createClient();

  const { error } = await supabase.from("profile_prefs").upsert(
    {
      profile_id: session.userId,
      interests: parseList(formData.get("interests")),
      want_to_try: parseList(formData.get("want_to_try")),
      avoid: parseList(formData.get("avoid")),
      access_needs: accessNeeds,
      access_notes: notes || null,
      share_access_with_partner:
        formData.get("share_access_with_partner") === "on",
    },
    { onConflict: "profile_id" }
  );

  if (error) {
    console.error("[prefs] save failed", error.message);
    return { error: "Couldn't save that. Try again." };
  }

  await advanceStep("prefs");
  return {};
}
