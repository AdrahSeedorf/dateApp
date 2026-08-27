"use server";

import { randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";

export type InviteState =
  | { ok: true; link: string; reused: boolean }
  | { ok: false; error: string };

const INVITE_DAYS = 365;

/** Prefers the configured site URL, falls back to the request's own host. */
async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";

  return `${protocol}://${host}`;
}

/**
 * Creates (or returns) the invite link for the caller's partner.
 *
 * The couple always comes from the session, never from anything the client
 * sends — this runs with the service role, so RLS isn't there to catch a
 * mistake. Getting that wrong would let someone invite a stranger into
 * another couple's memories.
 */
export async function createPartnerInvite(
  _prev: InviteState | undefined,
  formData: FormData
): Promise<InviteState> {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter their email address." };
  }

  if (email === session.email?.toLowerCase()) {
    return { ok: false, error: "That's your own address." };
  }

  const supabase = await createClient();
  let coupleId = session.coupleId;

  if (!coupleId) {
    const { data: couple, error: coupleError } = await supabase
      .from("couples")
      .insert({})
      .select("id")
      .single();

    if (coupleError || !couple) {
      console.error("[invite] couple create failed", coupleError?.message);
      return { ok: false, error: "Couldn't set that up. Try again." };
    }

    const { error: linkError } = await supabase
      .from("profiles")
      .update({ couple_id: couple.id })
      .eq("id", session.userId);

    if (linkError) {
      console.error("[invite] couple link failed", linkError.message);
      return { ok: false, error: "Couldn't set that up. Try again." };
    }

    coupleId = couple.id;
  }

  const admin = createAdminClient();
  const origin = await siteOrigin();

  // Two people to a couple. Without this, a second invite would quietly
  // add a third person to a shared set of memories.
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("couple_id", coupleId);

  if ((count ?? 0) >= 2) {
    return {
      ok: false,
      error: "There are already two of you here.",
    };
  }

  // Reuse a live invite rather than minting a second one. Two valid tokens
  // for the same person is how you end up unsure which link is current.
  const { data: existing } = await admin
    .from("invites")
    .select("token, expires_at")
    .eq("couple_id", coupleId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .limit(1)
    .maybeSingle();

  if (existing?.token) {
    return {
      ok: true,
      link: `${origin}/join?invite=${existing.token}`,
      reused: true,
    };
  }

  const token = randomBytes(16).toString("hex");
  const expiresAt = new Date(
    Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const { error } = await admin.from("invites").insert({
    token,
    couple_id: coupleId,
    email,
    display_name: displayName || null,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("[invite] create failed", error.message);
    return { ok: false, error: "Couldn't create that invite. Try again." };
  }

  return { ok: true, link: `${origin}/join?invite=${token}`, reused: false };
}
