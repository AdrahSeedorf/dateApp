/**
 * When the days counter should count, and from where.
 *
 * The obvious version of this animation — tick up from zero to 1,238 every
 * time the dashboard loads — is a slot machine. It says nothing, it says it
 * eight times a day, and by the third morning it is something you wait out.
 *
 * So the counter animates only when the number has actually changed since
 * you last looked, and it starts from the number you last saw. Usually that
 * means it ticks 1,237 → 1,238 once, on the first open of a new day, which
 * is precisely the thing worth noticing: one more.
 *
 * The "number you last saw" is kept in the browser, per device. That makes
 * it wrong in the harmless direction — a new phone shows no animation rather
 * than a false one.
 */

/** Longer than this and you're watching a progress bar, not a moment. */
export const MAX_STEPS = 14;

export type CountUpPlan = {
  /** Where the animation starts. */
  from: number;
  /** Seconds. Scaled to the distance so one day isn't given a full second. */
  duration: number;
};

/**
 * Returns null when the counter should simply render its value.
 *
 * That's the common case: same day, first ever visit, a number that went
 * backwards because someone corrected the start date, or storage we can't
 * read. Rendering the number plainly is never wrong — it's just quiet.
 */
export function planCountUp(
  value: number,
  lastSeen: number | null
): CountUpPlan | null {
  if (!Number.isFinite(value) || value < 0) return null;
  if (lastSeen === null || !Number.isFinite(lastSeen)) return null;

  // Unchanged, or corrected downwards. Counting down is a different feeling
  // entirely and not one this card is for.
  if (lastSeen >= value) return null;

  const distance = value - lastSeen;

  // Away for a month: start 14 back rather than replaying the whole absence.
  // The point is the arrival, not the ground covered.
  const from = distance > MAX_STEPS ? value - MAX_STEPS : lastSeen;
  const steps = value - from;

  return {
    from,
    // ~90ms a step, floored at 350ms so a single day still reads as a move
    // and capped so fourteen of them stay under a second and a half.
    duration: Math.min(1.3, Math.max(0.35, steps * 0.09)),
  };
}

/**
 * Eased position between two integers.
 *
 * Decelerating, matching the house curve: the number arrives rather than
 * stopping dead. `t` outside 0–1 is clamped, so a late animation frame
 * can't overshoot the real value and show a day that hasn't happened.
 */
export function countAt(plan: CountUpPlan, value: number, t: number): number {
  const clamped = Math.min(1, Math.max(0, t));
  const eased = 1 - Math.pow(1 - clamped, 3);

  return Math.round(plan.from + (value - plan.from) * eased);
}
