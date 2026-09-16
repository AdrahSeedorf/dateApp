"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { ensureCoupleId } from "@/lib/couple";
import { advanceStep } from "./actions";

export type SeedState = { error?: string };

const SLOTS = [0, 1, 2];
const MAX_TITLE = 120;

/**
 * Saves whichever of the three starter memories were filled in.
 *
 * A date isn't required — "the road trip" with no date is still worth
 * keeping, and demanding one would turn a warm question into homework.
 */
export async function seedMemories(
  _prev: SeedState,
  formData: FormData
): Promise<SeedState> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const entries = SLOTS.map((slot) => ({
    title: String(formData.get(`title-${slot}`) ?? "")
      .trim()
      .slice(0, MAX_TITLE),
    memory_date: String(formData.get(`date-${slot}`) ?? "").trim() || null,
  })).filter((entry) => entry.title);

  if (entries.length === 0) {
    // Nothing filled in is the same as skipping.
    await advanceStep("memories");
    return {};
  }

  const supabase = await createClient();
  const couple = await ensureCoupleId(
    supabase,
    session.userId,
    session.coupleId
  );

  if ("error" in couple) return { error: couple.error };

  const { error } = await supabase.from("memories").insert(
    entries.map((entry) => ({
      couple_id: couple.coupleId,
      created_by: session.userId,
      title: entry.title,
      memory_date: entry.memory_date,
    }))
  );

  if (error) {
    console.error("[seed-memories] insert failed", error.message);
    return { error: "Couldn't save those. Try again." };
  }

  await advanceStep("memories");
  return {};
}
