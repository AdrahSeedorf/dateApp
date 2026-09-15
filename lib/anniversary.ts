/**
 * The arithmetic behind "1,238 days" and "42 days to year four".
 *
 * Pure and separately tested, because every number on the dashboard comes
 * from here and a quiet off-by-one in a counter someone checks daily is the
 * kind of bug that erodes trust in the whole app.
 */

export type Anniversary = {
  /** Whole days since the start date. Never negative. */
  daysTogether: number;
  /** Which year they're currently in: 1 during the first year. */
  currentYear: number;
  /** The year the next anniversary completes. */
  nextYear: number;
  /** Date of the next anniversary, local. */
  nextDate: Date;
  daysUntilNext: number;
  /** 0–1 through the current year. */
  progress: number;
};

const DAY = 86_400_000;

function atMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/**
 * The anniversary falling in a given year.
 *
 * 29 February is the awkward case: three years in four it doesn't exist.
 * `new Date(2027, 1, 29)` silently rolls over to 1 March, which would show
 * the wrong date on the card. Clamping to the 28th keeps it inside February,
 * which is what people mean when they say "we celebrate on the 28th".
 */
function anniversaryIn(year: number, start: Date): Date {
  const month = start.getMonth();
  const day = start.getDate();

  const candidate = new Date(year, month, day);

  if (candidate.getMonth() !== month) {
    // Rolled over — the day doesn't exist in this year's month.
    return new Date(year, month + 1, 0); // last day of the intended month
  }

  return candidate;
}

export function anniversary(
  startedAt: string,
  now: Date = new Date()
): Anniversary {
  const start = atMidnight(parseDateOnly(startedAt));
  const today = atMidnight(now);

  const daysTogether = Math.max(
    0,
    Math.round((today.getTime() - start.getTime()) / DAY)
  );

  // Find the next anniversary on or after today. Starting from this calendar
  // year and stepping forward handles both a start date in the future and
  // one whose anniversary has already passed this year.
  let year = today.getFullYear();
  let next = anniversaryIn(year, start);

  while (next.getTime() <= today.getTime()) {
    year += 1;
    next = anniversaryIn(year, start);
  }

  const previous = anniversaryIn(year - 1, start);
  const span = next.getTime() - previous.getTime();
  const elapsed = today.getTime() - previous.getTime();

  const nextYear = year - start.getFullYear();

  return {
    daysTogether,
    // Before the first anniversary they're in year one.
    currentYear: Math.max(1, nextYear),
    nextYear: Math.max(1, nextYear),
    nextDate: next,
    daysUntilNext: Math.round((next.getTime() - today.getTime()) / DAY),
    progress: span > 0 ? Math.min(1, Math.max(0, elapsed / span)) : 0,
  };
}

/**
 * Greeting appropriate to the hour.
 *
 * Takes the current time rather than reading the clock, so a Server
 * Component can pass one in and tests can pin it.
 */
export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();

  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** "1,238" — grouped, because four-digit counters are the point. */
export function formatCount(value: number): string {
  return value.toLocaleString();
}
