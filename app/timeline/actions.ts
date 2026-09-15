"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";

export type MilestoneState = { error?: string };

const MAX_TITLE = 120;
const MAX_NOTE = 2_000;
const MAX_PLACE = 160;

/**
 * Keeps one emoji, or nothing.
 *
 * The icon sits on a 16px timeline node, so anything longer than a single
 * glyph doesn't fit. Uses the grapheme segmenter rather than string length
 * because many emoji — flags, skin tones, families — are several code points
 * that render as one character, and `.slice(0, 1)` would cut them in half.
 */
function firstGrapheme(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "grapheme",
    });
    const [first] = segmenter.segment(trimmed);
    return first?.segment ?? null;
  }

  return [...trimmed][0] ?? null;
}

export async function saveMilestone(
  _prev: MilestoneState,
  formData: FormData
): Promise<MilestoneState> {
  const session = await requireOnboarded();
  const supabase = await createClient();

  if (!session.coupleId) {
    return { error: "You're not linked with anyone yet." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const place = String(formData.get("place") ?? "").trim();
  const icon = String(formData.get("icon") ?? "");
  const happenedOn = String(formData.get("happened_on") ?? "").trim();

  if (!title) return { error: "Give it a name." };
  if (title.length > MAX_TITLE) {
    return { error: `Keep the name under ${MAX_TITLE} characters.` };
  }
  if (note.length > MAX_NOTE) {
    return { error: "That note is a bit long — trim it a little." };
  }
  if (place.length > MAX_PLACE) {
    return { error: `Keep the place under ${MAX_PLACE} characters.` };
  }

  // Deliberately no bound on the date in either direction. A milestone can
  // be decades back (the day you met) or years ahead (a wedding), and
  // guessing a sensible range would only get in the way.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(happenedOn)) {
    return { error: "Pick a date." };
  }

  const { error } = await supabase.from("milestones").insert({
    couple_id: session.coupleId,
    created_by: session.userId,
    title,
    note: note || null,
    place: place || null,
    icon: firstGrapheme(icon),
    happened_on: happenedOn,
  });

  if (error) {
    console.error("[milestones] insert failed", error.message);
    return { error: "Couldn't save that. Try again." };
  }

  revalidatePath("/timeline");
  redirect("/timeline");
}

export async function deleteMilestone(formData: FormData) {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase.from("milestones").delete().eq("id", id);

  if (error) {
    console.error("[milestones] delete failed", error.message);
  }

  revalidatePath("/timeline");
}
