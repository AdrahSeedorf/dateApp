import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The date lifecycle.
 *
 *   idea ──▶ planned ──▶ live ──▶ done ──▶ (a memory)
 *              │  ▲        │
 *              │  └─ reschedule
 *              └────────────▶ cancelled
 *
 * The rules about which state follows which live in migration 0013, in
 * functions the client calls rather than columns it sets. What's here is the
 * reading half: how to describe a plan, and when to offer which button.
 */

export type DateStatus = "saved" | "planned" | "live" | "done" | "cancelled";

export type DatePlan = {
  id: string;
  couple_id: string;
  title: string;
  activity: string | null;
  location_type: string | null;
  budget_estimate: string | null;
  outfit_note: string | null;
  vibe_note: string | null;
  notes: string | null;
  roles: Role[];
  scheduled_for: string | null;
  scheduled_time: string | null;
  status: DateStatus;
  reschedule_count: number;
  cancelled_at: string | null;
  cancel_reason: string | null;
  started_at: string | null;
  ended_at: string | null;
  memory_id: string | null;
  created_at: string;
};

export type Role = {
  label: string;
  /** Who's doing it. "both" is a real answer, not a cop-out. */
  who: "you" | "them" | "both";
};

/**
 * The things couples actually argue about beforehand.
 *
 * Suggestions, not a fixed list — the field is free text and a couple can add
 * "remembering the umbrella" if that's their recurring problem.
 */
export const ROLE_SUGGESTIONS = [
  "Driving",
  "Booking",
  "Paying",
  "Picking the music",
  "Taking the photos",
  "Getting us there on time",
] as const;

export const PLAN_COLUMNS =
  "id, couple_id, title, activity, location_type, budget_estimate, " +
  "outfit_note, vibe_note, notes, roles, scheduled_for, scheduled_time, " +
  "status, reschedule_count, cancelled_at, cancel_reason, started_at, " +
  "ended_at, memory_id, created_at";

/** Parses whatever is in the jsonb column, discarding anything malformed. */
export function parseRoles(value: unknown): Role[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (typeof entry !== "object" || entry === null) return [];

    const { label, who } = entry as Record<string, unknown>;

    if (typeof label !== "string" || !label.trim()) return [];
    if (who !== "you" && who !== "them" && who !== "both") return [];

    return [{ label: label.trim(), who }];
  });
}

/** Local midnight, so a date-only string doesn't shift a day by timezone. */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/**
 * Whole days until the date. Negative once it's passed.
 *
 * Deliberately date-level even when a time is known: "2 days" is what a
 * person wants on a dashboard, and counting down in hours to an evening
 * three weeks away is worse than useless.
 */
export function daysUntil(
  plan: DatePlan,
  now: Date = new Date()
): number | null {
  if (!plan.scheduled_for) return null;

  const target = parseDateOnly(plan.scheduled_for);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function describeCountdown(days: number | null): string | null {
  if (days === null) return null;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 0) return `In ${days} days`;
  if (days === -1) return "Yesterday";

  return `${Math.abs(days)} days ago`;
}

/** "7:30 pm" from a Postgres time value. */
export function formatTime(value: string | null): string | null {
  if (!value) return null;

  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours)) return null;

  const date = new Date(2000, 0, 1, hours, minutes ?? 0);

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Whether the start button should be offered.
 *
 * Available from the morning of, not from the exact minute: people arrive
 * early, plans drift, and a button that refuses to work at 6:55 for a 7:00
 * date would be actively annoying.
 *
 * Also allowed on a date whose day has passed — they may simply have
 * forgotten to press it, and refusing would mean the evening can never be
 * captured at all.
 */
export function canStart(plan: DatePlan, now: Date = new Date()): boolean {
  if (plan.status !== "planned") return false;

  const days = daysUntil(plan, now);

  return days !== null && days <= 0;
}

/** How long it's been running. */
export function elapsedMinutes(
  plan: DatePlan,
  now: Date = new Date()
): number | null {
  if (!plan.started_at) return null;

  return Math.max(
    0,
    Math.floor((now.getTime() - new Date(plan.started_at).getTime()) / 60_000)
  );
}

export function formatElapsed(minutes: number | null): string | null {
  if (minutes === null) return null;
  if (minutes < 1) return "just started";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (rest === 0) return `${hours}h`;

  return `${hours}h ${rest}m`;
}

/**
 * A planned date whose day has passed without anyone starting it.
 *
 * The dashboard asks about these rather than letting them rot — a plan that
 * quietly expires teaches people the app isn't paying attention.
 */
export function isOverdue(plan: DatePlan, now: Date = new Date()): boolean {
  if (plan.status !== "planned") return false;

  const days = daysUntil(plan, now);

  return days !== null && days < 0;
}

/**
 * A finished date that hasn't become a memory yet.
 *
 * The one prompt that matters most: without it, the evening is recorded as a
 * status change and nothing else.
 */
export function awaitingMemory(plan: DatePlan): boolean {
  return plan.status === "done" && !plan.memory_id;
}

/**
 * The next date worth showing on the dashboard.
 *
 * A running date beats everything. After that, the soonest upcoming one —
 * and a date today outranks a date tomorrow even if the tomorrow one was
 * planned first.
 */
export function highlightPlan(
  plans: DatePlan[],
  now: Date = new Date()
): DatePlan | null {
  const live = plans.find((p) => p.status === "live");
  if (live) return live;

  const upcoming = plans
    .filter((p) => p.status === "planned" && p.scheduled_for)
    .sort((a, b) => a.scheduled_for!.localeCompare(b.scheduled_for!));

  // Prefer one that hasn't happened yet; fall back to the most overdue.
  const future = upcoming.find((p) => (daysUntil(p, now) ?? -1) >= 0);
  if (future) return future;

  return upcoming[upcoming.length - 1] ?? null;
}

type Client = SupabaseClient;

export async function listPlans(
  supabase: Client
): Promise<{ plans: DatePlan[]; error?: string }> {
  const { data, error } = await supabase
    .from("date_plans")
    .select(PLAN_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[dates] list failed", error.message);
    return { plans: [], error: "Couldn't load your dates." };
  }

  const plans = (data ?? []).map((row) => ({
    ...(row as unknown as DatePlan),
    roles: parseRoles((row as { roles?: unknown }).roles),
  }));

  return { plans };
}

export async function getPlan(
  supabase: Client,
  id: string
): Promise<DatePlan | null> {
  const { data, error } = await supabase
    .from("date_plans")
    .select(PLAN_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[dates] fetch failed", error.message);
    return null;
  }

  if (!data) return null;

  return {
    ...(data as unknown as DatePlan),
    roles: parseRoles((data as { roles?: unknown }).roles),
  };
}
