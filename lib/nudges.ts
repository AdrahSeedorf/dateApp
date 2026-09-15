import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * One-tap affection.
 *
 * Deliberately tiny. See migration 0009 for why this isn't a chat feature.
 */

export const NUDGE_KINDS = [
  { key: "kiss", emoji: "💋", label: "A kiss", received: "sent you a kiss" },
  {
    key: "thinking",
    emoji: "💭",
    label: "Thinking of you",
    received: "is thinking of you",
  },
  { key: "hug", emoji: "🤗", label: "A hug", received: "sent you a hug" },
  {
    key: "miss_you",
    emoji: "🌙",
    label: "Missing you",
    received: "is missing you",
  },
  {
    key: "proud",
    emoji: "✨",
    label: "Proud of you",
    received: "is proud of you",
  },
] as const;

export type NudgeKind = (typeof NUDGE_KINDS)[number]["key"];

const KIND_KEYS = new Set<string>(NUDGE_KINDS.map((k) => k.key));

export function isNudgeKind(value: unknown): value is NudgeKind {
  return typeof value === "string" && KIND_KEYS.has(value);
}

export function nudgeMeta(kind: string) {
  return NUDGE_KINDS.find((k) => k.key === kind) ?? NUDGE_KINDS[0];
}

export type Nudge = {
  id: string;
  from_id: string;
  to_id: string;
  kind: string;
  in_reply_to: string | null;
  seen_at: string | null;
  created_at: string;
};

/**
 * "12m ago", "3h ago", "yesterday".
 *
 * Coarse on purpose. A nudge from four minutes ago and one from nine minutes
 * ago are the same event emotionally, and second-level precision would make
 * a warm gesture feel like a delivery receipt.
 */
export function timeAgo(value: string, now: Date = new Date()): string {
  const then = new Date(value).getTime();
  const minutes = Math.floor((now.getTime() - then) / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/**
 * The most recent nudge in either direction.
 *
 * Exactly one, and not filtered to incoming: the card needs to say "you sent
 * them one" as readily as "they sent you one", and a dashboard that only
 * ever showed arrivals would read as an inbox. A stack of unanswered
 * gestures turns affection into a chore.
 */
export async function latestNudge(
  supabase: SupabaseClient
): Promise<Nudge | null> {
  const { data, error } = await supabase
    .from("nudges")
    .select("id, from_id, to_id, kind, in_reply_to, seen_at, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[nudges] latest lookup failed", error.message);
    return null;
  }

  return (data as Nudge | null) ?? null;
}

/** Whether the last thing that happened was them reaching out. */
export function awaitingReply(nudge: Nudge | null, userId: string): boolean {
  return Boolean(nudge && nudge.to_id === userId);
}
