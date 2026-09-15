import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns the caller's couple, creating one if they don't have it yet.
 *
 * Invited people already belong to a couple. Someone who signed up on their
 * own doesn't, and can't save a plan or a memory until they do — so the
 * container gets created at the first moment something needs to go in it,
 * rather than up front.
 */
/**
 * The other person in the couple, if anyone has joined yet.
 *
 * Returns null when they're alone — which is the normal state between
 * creating an invite and it being redeemed, not an error. Callers that need
 * a partner (letters, for one) have to handle that rather than assume.
 */
export async function getPartner(
  supabase: SupabaseClient,
  userId: string,
  coupleId: string | null
): Promise<{ id: string; displayName: string | null } | null> {
  if (!coupleId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("couple_id", coupleId)
    .neq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("[couple] partner lookup failed", error.message);
    return null;
  }

  if (!data) return null;

  return { id: data.id, displayName: data.display_name ?? null };
}

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
