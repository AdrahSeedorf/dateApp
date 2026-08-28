import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns the caller's couple, creating one if they don't have it yet.
 *
 * Invited people already belong to a couple. Someone who signed up on their
 * own doesn't, and can't save a plan or a memory until they do — so the
 * container gets created at the first moment something needs to go in it,
 * rather than up front.
 */
export async function ensureCoupleId(
  supabase: SupabaseClient,
  userId: string,
  existingCoupleId: string | null
): Promise<{ coupleId: string } | { error: string }> {
  if (existingCoupleId) return { coupleId: existingCoupleId };

  const { data: couple, error: coupleError } = await supabase
    .from("couples")
    .insert({})
    .select("id")
    .single();

  if (coupleError || !couple) {
    console.error("[couple] create failed", coupleError?.message);
    return { error: "Couldn't set that up. Try again." };
  }

  const { error: linkError } = await supabase
    .from("profiles")
    .update({ couple_id: couple.id })
    .eq("id", userId);

  if (linkError) {
    console.error("[couple] link failed", linkError.message);
    return { error: "Couldn't set that up. Try again." };
  }

  return { coupleId: couple.id };
}
