import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Milestones — the relationship's spine.
 *
 * Past and future live on one timeline. Which side of today an entry falls on
 * is worked out here, at read time, from its date. It is never stored: a
 * stored "upcoming" flag is correct the day it's written and silently wrong
 * every day after.
 */

export type Milestone = {
  id: string;
  couple_id: string;
  title: string;
  note: string | null;
  happened_on: string;
  icon: string | null;
  place: string | null;
  memory_id: string | null;
  source: "manual" | "stage_change";
};

/**
 * A milestone plus everything the timeline needs to draw it.
 *
 * `anchor` entries are synthesised from couples.started_at rather than read
 * from the table — see the migration for why there is no day-one row.
 */
export type TimelineEntry = {
  id: string;
  title: string;
  note: string | null;
  date: string;
  icon: string | null;
  place: string | null;
  memoryId: string | null;
  upcoming: boolean;
  anchor: boolean;
  /** Days away, for upcoming entries. Null once the day has passed. */
  daysAway: number | null;
};

const COLUMNS =
  "id, couple_id, title, note, happened_on, icon, place, memory_id, source";

/** Midnight today, so "today" counts as having happened. */
function startOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Parses a yyyy-mm-dd date as local midnight.
 *
 * `new Date("2026-09-15")` is parsed as UTC, which lands on the previous day
 * for anyone west of Greenwich and makes a milestone appear to shift by a day
 * depending on where you are. Splitting the parts avoids that entirely.
 */
export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function formatMilestoneDate(value: string): string {
  return parseDateOnly(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "246 days away", "Tomorrow", "Today". */
export function describeUpcoming(daysAway: number): string {
  if (daysAway <= 0) return "Today";
  if (daysAway === 1) return "Tomorrow";
  return `${daysAway} days away`;
}

function toEntry(
  milestone: Milestone,
  today: Date
): TimelineEntry {
  const date = parseDateOnly(milestone.happened_on);
  const upcoming = date > today;

  return {
    id: milestone.id,
    title: milestone.title,
    note: milestone.note,
    date: milestone.happened_on,
    icon: milestone.icon,
    place: milestone.place,
    memoryId: milestone.memory_id,
    upcoming,
    anchor: false,
    daysAway: upcoming ? daysBetween(today, date) : null,
  };
}

/**
 * Builds the timeline: the anchor, then every milestone, oldest first.
 *
 * Sorting happens here rather than in SQL because the synthesised anchor has
 * to slot into the same ordering, and doing it in two places is how the two
 * end up disagreeing.
 */
export function buildTimeline(
  milestones: Milestone[],
  startedAt: string | null,
  now: Date = new Date()
): TimelineEntry[] {
  const today = startOfToday(now);
  const entries = milestones.map((m) => toEntry(m, today));

  if (startedAt) {
    const date = parseDateOnly(startedAt);
    const upcoming = date > today;

    entries.push({
      id: "anchor",
      title: "Day one",
      note: "Where the counter starts.",
      date: startedAt,
      icon: "❤️",
      place: null,
      memoryId: null,
      upcoming,
      anchor: true,
      daysAway: upcoming ? daysBetween(today, date) : null,
    });
  }

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

export async function listMilestones(
  supabase: SupabaseClient
): Promise<{ milestones: Milestone[]; error?: string }> {
  const { data, error } = await supabase
    .from("milestones")
    .select(COLUMNS)
    .order("happened_on", { ascending: true });

  if (error) {
    console.error("[milestones] list failed", error.message);
    return { milestones: [], error: "Couldn't load your timeline." };
  }

  return { milestones: (data ?? []) as unknown as Milestone[] };
}
