import assert from "node:assert/strict";
import { test } from "node:test";

import {
  awaitingMemory,
  canStart,
  daysUntil,
  describeCountdown,
  elapsedMinutes,
  formatElapsed,
  formatTime,
  highlightPlan,
  isOverdue,
  parseRoles,
  type DatePlan,
} from "./datePlans.ts";

/**
 *   node --test --experimental-strip-types lib/datePlans.test.ts
 */

const NOW = new Date(2026, 8, 16, 14, 0, 0); // 16 Sept 2026, 2pm local

function plan(over: Partial<DatePlan> = {}): DatePlan {
  return {
    id: "p1",
    couple_id: "c1",
    title: "Blue Mountains",
    activity: null,
    location_type: null,
    budget_estimate: null,
    outfit_note: null,
    vibe_note: null,
    notes: null,
    roles: [],
    scheduled_for: null,
    scheduled_time: null,
    status: "saved",
    reschedule_count: 0,
    cancelled_at: null,
    cancel_reason: null,
    started_at: null,
    ended_at: null,
    memory_id: null,
    created_at: "2026-09-01",
    ...over,
  };
}

test("the countdown is in whole days, from local midnight", () => {
  assert.equal(daysUntil(plan({ scheduled_for: "2026-09-16" }), NOW), 0);
  assert.equal(daysUntil(plan({ scheduled_for: "2026-09-17" }), NOW), 1);
  assert.equal(daysUntil(plan({ scheduled_for: "2026-09-26" }), NOW), 10);
  assert.equal(daysUntil(plan({ scheduled_for: "2026-09-15" }), NOW), -1);
  assert.equal(daysUntil(plan(), NOW), null);
});

test("countdown wording reads naturally on both sides of today", () => {
  assert.equal(describeCountdown(0), "Today");
  assert.equal(describeCountdown(1), "Tomorrow");
  assert.equal(describeCountdown(9), "In 9 days");
  assert.equal(describeCountdown(-1), "Yesterday");
  assert.equal(describeCountdown(-5), "5 days ago");
  assert.equal(describeCountdown(null), null);
});

test("start is offered from the morning of, not the exact minute", () => {
  // 2pm on the day of a 7pm date: the button must work. People arrive early
  // and a refusal at 6:55 would be infuriating.
  const today = plan({ status: "planned", scheduled_for: "2026-09-16", scheduled_time: "19:00" });
  assert.equal(canStart(today, NOW), true);

  const tomorrow = plan({ status: "planned", scheduled_for: "2026-09-17" });
  assert.equal(canStart(tomorrow, NOW), false);
});

test("a date whose day has passed can still be started", () => {
  // They forgot to press it. Refusing means the evening can never be
  // captured, which is worse than a slightly late start time.
  const missed = plan({ status: "planned", scheduled_for: "2026-09-14" });
  assert.equal(canStart(missed, NOW), true);
});

test("only a planned date can be started", () => {
  for (const status of ["saved", "live", "done", "cancelled"] as const) {
    const p = plan({ status, scheduled_for: "2026-09-16" });
    assert.equal(canStart(p, NOW), false, `${status} should not be startable`);
  }
});

test("overdue means planned and past, nothing else", () => {
  assert.equal(
    isOverdue(plan({ status: "planned", scheduled_for: "2026-09-15" }), NOW),
    true
  );
  assert.equal(
    isOverdue(plan({ status: "planned", scheduled_for: "2026-09-16" }), NOW),
    false,
    "today is not overdue"
  );
  assert.equal(
    isOverdue(plan({ status: "done", scheduled_for: "2026-09-01" }), NOW),
    false
  );
  assert.equal(
    isOverdue(plan({ status: "cancelled", scheduled_for: "2026-09-01" }), NOW),
    false,
    "a cancelled date is not nagging material"
  );
});

test("a finished date awaits a memory until it has one", () => {
  assert.equal(awaitingMemory(plan({ status: "done" })), true);
  assert.equal(awaitingMemory(plan({ status: "done", memory_id: "m1" })), false);
  assert.equal(awaitingMemory(plan({ status: "live" })), false);
});

test("elapsed time is readable at every scale", () => {
  const started = (minutesAgo: number) =>
    plan({
      status: "live",
      started_at: new Date(NOW.getTime() - minutesAgo * 60_000).toISOString(),
    });

  assert.equal(formatElapsed(elapsedMinutes(started(0), NOW)), "just started");
  assert.equal(formatElapsed(elapsedMinutes(started(25), NOW)), "25 min");
  assert.equal(formatElapsed(elapsedMinutes(started(60), NOW)), "1h");
  assert.equal(formatElapsed(elapsedMinutes(started(145), NOW)), "2h 25m");
  assert.equal(elapsedMinutes(plan(), NOW), null);
});

test("a clock skew can't produce negative elapsed time", () => {
  const future = plan({
    status: "live",
    started_at: new Date(NOW.getTime() + 60_000).toISOString(),
  });

  assert.equal(elapsedMinutes(future, NOW), 0);
});

test("a running date outranks everything on the dashboard", () => {
  const live = plan({ id: "live", status: "live" });
  const soon = plan({ id: "soon", status: "planned", scheduled_for: "2026-09-17" });

  assert.equal(highlightPlan([soon, live], NOW)?.id, "live");
});

test("the soonest upcoming date wins, regardless of when it was planned", () => {
  const later = plan({ id: "later", status: "planned", scheduled_for: "2026-10-01" });
  const sooner = plan({ id: "sooner", status: "planned", scheduled_for: "2026-09-18" });

  assert.equal(highlightPlan([later, sooner], NOW)?.id, "sooner");
});

test("with nothing upcoming, the most recent overdue date surfaces", () => {
  // Better to be asked about a date you missed than to have it vanish.
  const old = plan({ id: "old", status: "planned", scheduled_for: "2026-08-01" });
  const recent = plan({ id: "recent", status: "planned", scheduled_for: "2026-09-14" });

  assert.equal(highlightPlan([old, recent], NOW)?.id, "recent");
});

test("unscheduled and finished dates never take the highlight", () => {
  const ideas = [plan({ status: "saved" }), plan({ status: "done" })];
  assert.equal(highlightPlan(ideas, NOW), null);
  assert.equal(highlightPlan([], NOW), null);
});

test("malformed roles are discarded rather than rendered", () => {
  // The column is jsonb, so anything could be in it.
  const roles = parseRoles([
    { label: "Driving", who: "you" },
    { label: "", who: "them" },
    { label: "No who" },
    { who: "both" },
    { label: "Bad who", who: "maybe" },
    "not an object",
    null,
    { label: "  Paying  ", who: "both" },
  ]);

  assert.deepEqual(roles, [
    { label: "Driving", who: "you" },
    { label: "Paying", who: "both" },
  ]);

  assert.deepEqual(parseRoles(null), []);
  assert.deepEqual(parseRoles("nonsense"), []);
});

test("times format in local convention, and survive nonsense", () => {
  assert.ok(formatTime("19:30:00"));
  assert.equal(formatTime(null), null);
  assert.equal(formatTime("not-a-time"), null);
});
