/**
 * Long-distance mode.
 *
 * See migration 0010 for why this is chosen rather than computed.
 */

export type DistanceMode = "auto" | "together" | "apart";

export function isDistanceMode(value: unknown): value is DistanceMode {
  return value === "auto" || value === "together" || value === "apart";
}

/** `auto` means unanswered, and unanswered behaves as together. */
export function isApart(mode: unknown): boolean {
  return mode === "apart";
}

/**
 * Whether two locations look different enough to be worth asking about.
 *
 * A weak signal on purpose. It only ever produces a question — never a
 * setting — because comparing free text is not a distance calculation:
 * "Penrith" and "Penrith, NSW" are one place, and two Springfields are not.
 * Normalising punctuation and case removes the most common false positives;
 * everything past that is the couple's to answer.
 */
export function locationsLookDifferent(
  a: string | null,
  b: string | null
): boolean {
  if (!a || !b) return false;

  const normalise = (value: string) =>
    value
      .toLowerCase()
      .replace(/[.,]/g, " ")
      .split(/\s+/)
      .filter(Boolean);

  const first = normalise(a);
  const second = normalise(b);

  if (first.length === 0 || second.length === 0) return false;

  // Any shared token — a suburb, a city, a state — is enough to stop this
  // nagging a couple who live together and typed their address differently.
  const shared = first.some((token) => second.includes(token));

  return !shared;
}

/** The local time where someone is, or null if we don't know their zone. */
export function localTime(
  timezone: string | null,
  now: Date = new Date()
): string | null {
  if (!timezone) return null;

  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }).format(now);
  } catch {
    // A zone that was valid when stored can be removed from the database in
    // a later ICU update. Showing nothing beats throwing on the dashboard.
    return null;
  }
}

/**
 * Whole days between two zones' current calendar dates.
 *
 * Not a UTC offset: what matters to a couple is "it's already tomorrow for
 * you", which is a date comparison rather than an hours calculation.
 */
export function dayDifference(
  mine: string | null,
  theirs: string | null,
  now: Date = new Date()
): number | null {
  if (!mine || !theirs) return null;

  try {
    const dateIn = (zone: string) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(now);

    const a = new Date(`${dateIn(mine)}T00:00:00Z`).getTime();
    const b = new Date(`${dateIn(theirs)}T00:00:00Z`).getTime();

    return Math.round((b - a) / 86_400_000);
  } catch {
    return null;
  }
}

/** "It's tomorrow there" / "It's still yesterday there". */
export function describeDayDifference(difference: number | null): string | null {
  if (difference === null || difference === 0) return null;
  if (difference === 1) return "already tomorrow there";
  if (difference === -1) return "still yesterday there";

  return difference > 0
    ? `${difference} days ahead`
    : `${Math.abs(difference)} days behind`;
}

export function daysUntilReunion(
  reunionOn: string | null,
  now: Date = new Date()
): number | null {
  if (!reunionOn) return null;

  const [year, month, day] = reunionOn.split("-").map(Number);
  if (!year) return null;

  const target = new Date(year, (month ?? 1) - 1, day ?? 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function describeReunion(days: number | null): string | null {
  if (days === null) return null;
  if (days < 0) return null; // Already happened; the couple can move it on.
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";

  return `${days} days`;
}

/**
 * What the date generator should aim for when they're apart.
 *
 * The whole point of the mode: "drive to the river at sunset" is useless to
 * two people on different continents, and an app that keeps suggesting it is
 * worse than one that suggests nothing.
 */
export const APART_GUIDANCE = `These two are in different places and cannot be together in person. Every suggestion must be something they can genuinely do at the same time from separate locations, or separately in a way that connects them.

Good shapes: watching the same film in sync, cooking the same recipe together over a call, reading the same chapter and comparing notes, a shared playlist made in turns, playing something online together, a tasting of the same thing bought separately, writing to each other on a set evening.

Do not suggest going anywhere together, meeting, travelling to see each other, or anything requiring shared physical presence. Do not name a venue. Budget covers what each of them spends separately.`;
