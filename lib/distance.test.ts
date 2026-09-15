import assert from "node:assert/strict";
import { test } from "node:test";

import {
  APART_GUIDANCE,
  dayDifference,
  daysUntilReunion,
  describeDayDifference,
  describeReunion,
  isApart,
  isDistanceMode,
  localTime,
  locationsLookDifferent,
} from "./distance.ts";

/**
 *   node --test --experimental-strip-types lib/distance.test.ts
 */

test("unanswered behaves as together, never as apart", () => {
  // `auto` is the default for every existing couple, so getting this wrong
  // would silently switch the whole app into long-distance mode.
  assert.equal(isApart("auto"), false);
  assert.equal(isApart("together"), false);
  assert.equal(isApart("apart"), true);
  assert.equal(isApart(null), false);
  assert.equal(isApart(undefined), false);
});

test("distance mode validation rejects anything unexpected", () => {
  assert.equal(isDistanceMode("apart"), true);
  assert.equal(isDistanceMode("far"), false);
  assert.equal(isDistanceMode(null), false);
});

test("locations sharing any token are not treated as different", () => {
  // The false positives that would nag a couple living together.
  assert.equal(locationsLookDifferent("Penrith", "Penrith, NSW"), false);
  assert.equal(locationsLookDifferent("penrith nsw", "Penrith, NSW"), false);
  assert.equal(locationsLookDifferent("Sydney, NSW", "Newtown, NSW"), false);
});

test("genuinely unrelated locations do look different", () => {
  assert.equal(locationsLookDifferent("Brooklyn, NY", "Positano, Italy"), true);
  assert.equal(locationsLookDifferent("Penrith", "Auckland"), true);
});

test("a missing location never triggers the question", () => {
  assert.equal(locationsLookDifferent(null, "Sydney"), false);
  assert.equal(locationsLookDifferent("Sydney", null), false);
  assert.equal(locationsLookDifferent("", "Sydney"), false);
});

test("local time renders for a real zone and fails soft otherwise", () => {
  const now = new Date("2026-09-15T02:00:00Z");

  assert.ok(localTime("Australia/Sydney", now));
  assert.equal(localTime(null, now), null);
  // A zone valid when stored can vanish in a later ICU update; the dashboard
  // should show nothing rather than throw.
  assert.equal(localTime("Not/AZone", now), null);
});

test("the day difference is a calendar comparison, not an offset", () => {
  // 02:00 UTC on the 15th is midday on the 15th in Sydney and 22:00 on the
  // 14th in New York — a whole day apart by the only measure that matters.
  const now = new Date("2026-09-15T02:00:00Z");

  assert.equal(dayDifference("America/New_York", "Australia/Sydney", now), 1);
  assert.equal(dayDifference("Australia/Sydney", "America/New_York", now), -1);
  assert.equal(dayDifference("Australia/Sydney", "Australia/Sydney", now), 0);
  assert.equal(dayDifference(null, "Australia/Sydney", now), null);
});

test("day difference reads naturally, and says nothing when same-day", () => {
  assert.equal(describeDayDifference(0), null);
  assert.equal(describeDayDifference(null), null);
  assert.equal(describeDayDifference(1), "already tomorrow there");
  assert.equal(describeDayDifference(-1), "still yesterday there");
  assert.equal(describeDayDifference(2), "2 days ahead");
});

test("the reunion countdown handles today, tomorrow and the past", () => {
  const now = new Date(2026, 8, 15);

  assert.equal(daysUntilReunion("2026-09-15", now), 0);
  assert.equal(daysUntilReunion("2026-09-16", now), 1);
  assert.equal(daysUntilReunion("2026-10-15", now), 30);
  assert.equal(daysUntilReunion(null, now), null);

  assert.equal(describeReunion(0), "Today");
  assert.equal(describeReunion(1), "Tomorrow");
  assert.equal(describeReunion(30), "30 days");
  // A date that's been and gone shouldn't read "-4 days".
  assert.equal(describeReunion(-4), null);
});

test("apart guidance rules out in-person suggestions explicitly", () => {
  // The failure this mode exists to prevent is the generator cheerfully
  // proposing a riverside walk to two people on different continents.
  const text = APART_GUIDANCE.toLowerCase();

  assert.ok(text.includes("cannot be together in person"));
  assert.ok(text.includes("do not suggest going anywhere together"));
  assert.ok(text.includes("do not name a venue"));
});
