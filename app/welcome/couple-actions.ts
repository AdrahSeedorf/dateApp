"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { ensureCoupleId } from "@/lib/couple";
import { isStage, safeTheme } from "@/lib/coupleProfile";
import { advanceStep } from "./actions";

export type CoupleState = { error?: string };

const MAX_NAME = 80;
const MAX_FIRST_MEMORY = 160;

/**
 * Saves the shared half of setup: what to call yourselves, when it started,
 * the chapter you're in, and the theme.
 *
 * Optionally also writes a founding memory. That exists to answer the empty
 * vault: a couple who finish setup have at least one thing in it, so the
 * first sight of the memory screen isn't a blank page.
 */
export async function saveCoupleProfile(
  _prev: CoupleState,
  formData: FormData
): Promise<CoupleState> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const supabase = await createClient();

  const couple = await ensureCoupleId(
    supabase,
    session.userId,
    session.coupleId
  );

  if ("error" in couple) return { error: couple.error };

  const name = String(formData.get("couple_name") ?? "").trim();
  const startedAt = String(formData.get("started_at") ?? "").trim();
  const stage = String(formData.get("stage") ?? "");
  const theme = safeTheme(formData.get("theme"));

  const firstMemory = String(formData.get("first_memory") ?? "").trim();
  const firstMemoryWhere = String(formData.get("first_memory_where") ?? "").trim();

  if (name.length > MAX_NAME) {
    return { error: `Keep it under ${MAX_NAME} characters.` };
  }

  if (startedAt && !/^\d{4}-\d{2}-\d{2}$/.test(startedAt)) {
    return { error: "That date didn't make sense." };
  }

  if (firstMemory.length > MAX_FIRST_MEMORY) {
    return { error: "Keep the first memory short — you can expand it later." };
  }

  const { error } = await supabase
    .from("couples")
    .update({
      name: name || null,
      // Left null rather than defaulted to today: an invented start date is
      // worse than no counter, and the dashboard prompts for it anyway.
      started_at: startedAt || null,
      stage: isStage(stage) ? stage : null,
      theme,
    })
    .eq("id", couple.coupleId);

  if (error) {
    console.error("[onboarding] couple update failed", error.message);
    return { error: "Couldn't save that. Try again." };
  }

  if (firstMemory) {
    const { error: memoryError } = await supabase.from("memories").insert({
      couple_id: couple.coupleId,
      created_by: session.userId,
      title: firstMemory,
      location: firstMemoryWhere || null,
      category: "Firsts",
    });

    // Non-fatal on purpose: losing the whole step because a bonus memory
    // failed would be a poor trade.
    if (memoryError) {
      console.error("[onboarding] first memory failed", memoryError.message);
    }
  }

  revalidatePath("/welcome");
  await advanceStep("couple");
  return {};
}
