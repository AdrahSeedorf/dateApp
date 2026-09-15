import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getSessionProfile } from "@/lib/auth";
import { isApart } from "@/lib/distance";
import {
  ACCESS_NEEDS,
  parseAccessNeeds,
  type AccessNeedKey,
} from "@/lib/accessNeeds";

export type CoupleContext = {
  location: string | null;
  interests: string[];
  wantToTry: string[];
  avoid: string[];
  /** Every need across both people — what the plan must actually satisfy. */
  accessNeeds: AccessNeedKey[];
  /** The subset this viewer is allowed to be told about. */
  visibleAccessNeeds: AccessNeedKey[];
  accessNotes: string[];
  /** Where the relationship is now. Shapes what kind of plan suits them. */
  stage: string | null;
  /** True when they can't be in the same room — changes everything. */
  apart: boolean;
};

type PrefRow = {
  profile_id: string;
  interests: string[] | null;
  want_to_try: string[] | null;
  avoid: string[] | null;
  access_needs: unknown;
  access_notes: string | null;
  share_access_with_partner: boolean | null;
};

/**
 * Gathers what should shape a date idea for this couple.
 *
 * Two separate lists of access needs, deliberately:
 *
 *   accessNeeds        — everyone's, used to build the plan
 *   visibleAccessNeeds — only what the requester may be told about
 *
 * The preferences UI promises that ideas account for your needs whether or
 * not you share them, so generation has to see all of them. But the reply
 * explains how the plan meets each need, and printing a partner's private
 * need back to the other person would leak exactly what the toggle exists
 * to protect. So the plan honours everything while the explanation stays
 * within what the reader is entitled to know.
 */
export async function getCoupleContext(): Promise<CoupleContext | null> {
  const session = await getSessionProfile();
  if (!session) return null;

  const empty: CoupleContext = {
    location: session.location,
    interests: [],
    wantToTry: [],
    avoid: [],
    accessNeeds: [],
    visibleAccessNeeds: [],
    accessNotes: [],
    stage: null,
    apart: false,
  };

  if (!session.coupleId) return empty;

  const supabase = await createClient();

  const [{ data: members }, { data: couple }] = await Promise.all([
    supabase.from("profiles").select("id").eq("couple_id", session.coupleId),
    supabase
      .from("couples")
      .select("stage, distance_mode")
      .eq("id", session.coupleId)
      .maybeSingle(),
  ]);

  const stage = (couple?.stage as string | null) ?? null;
  const apart = isApart(couple?.distance_mode);

  const memberIds = (members ?? []).map((m) => m.id as string);
  if (memberIds.length === 0) return { ...empty, stage, apart };

  // Service role: a partner's private preferences are unreadable through RLS
  // by design, but generation still has to account for them.
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profile_prefs")
    .select(
      "profile_id, interests, want_to_try, avoid, access_needs, access_notes, share_access_with_partner"
    )
    .in("profile_id", memberIds);

  if (error) {
    console.error("[couple-context] prefs lookup failed", error.message);
    return { ...empty, stage, apart };
  }

  const rows = (data ?? []) as PrefRow[];

  const interests = new Set<string>();
  const wantToTry = new Set<string>();
  const avoid = new Set<string>();
  const allNeeds = new Set<AccessNeedKey>();
  const visibleNeeds = new Set<AccessNeedKey>();
  const notes: string[] = [];

  for (const row of rows) {
    const isOwn = row.profile_id === session.userId;
    const mayReveal = isOwn || Boolean(row.share_access_with_partner);

    (row.interests ?? []).forEach((item) => interests.add(item));
    (row.want_to_try ?? []).forEach((item) => wantToTry.add(item));
    (row.avoid ?? []).forEach((item) => avoid.add(item));

    const needs = parseAccessNeeds(row.access_needs);

    for (const need of ACCESS_NEEDS) {
      if (!needs[need.key]) continue;

      allNeeds.add(need.key);
      if (mayReveal) visibleNeeds.add(need.key);
    }

    if (row.access_notes && mayReveal) notes.push(row.access_notes);
  }

  return {
    location: session.location,
    interests: [...interests],
    wantToTry: [...wantToTry],
    avoid: [...avoid],
    accessNeeds: [...allNeeds],
    visibleAccessNeeds: [...visibleNeeds],
    accessNotes: notes,
    stage,
    apart,
  };
}
