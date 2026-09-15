"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { getPartner } from "@/lib/couple";
import { isNudgeKind } from "@/lib/nudges";

export type NudgeState = { error?: string; sent?: boolean };

/**
 * Sends a nudge, optionally as a reply to one just received.
 *
 * Marking the original seen happens here rather than on page load: opening
 * the dashboard shouldn't quietly consume a gesture the person hasn't
 * actually registered. It's marked when they respond to it.
 */
export async function sendNudge(
  _prev: NudgeState,
  formData: FormData
): Promise<NudgeState> {
  const session = await requireOnboarded();
  const supabase = await createClient();

  if (!session.coupleId) return { error: "You're not linked with anyone yet." };

  const partner = await getPartner(supabase, session.userId, session.coupleId);

  if (!partner) {
    return { error: "Nobody to send it to yet." };
  }

  const kind = String(formData.get("kind") ?? "");
  const replyTo = String(formData.get("reply_to") ?? "") || null;

  if (!isNudgeKind(kind)) return { error: "Pick one." };

  const { error } = await supabase.from("nudges").insert({
    couple_id: session.coupleId,
    from_id: session.userId,
    to_id: partner.id,
    kind,
    in_reply_to: replyTo,
  });

  if (error) {
    console.error("[nudges] send failed", error.message);
    return { error: "Couldn't send that. Try again." };
  }

  if (replyTo) {
    // Best effort: the reply is the thing that matters, and failing to
    // stamp the original shouldn't surface as an error.
    const { error: seenError } = await supabase
      .from("nudges")
      .update({ seen_at: new Date().toISOString() })
      .eq("id", replyTo)
      .is("seen_at", null);

    if (seenError) {
      console.error("[nudges] mark seen failed", seenError.message);
    }
  }

  revalidatePath("/home");
  return { sent: true };
}

/** Acknowledge without replying — for when a response isn't wanted. */
export async function dismissNudge(formData: FormData) {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // RLS restricts this to nudges addressed to the caller.
  const { error } = await supabase
    .from("nudges")
    .update({ seen_at: new Date().toISOString() })
    .eq("id", id)
    .is("seen_at", null);

  if (error) {
    console.error("[nudges] dismiss failed", error.message);
  }

  revalidatePath("/home");
}
