import assert from "node:assert/strict";
import { test } from "node:test";

import { anniversary, formatCount, greeting } from "./anniversary.ts";

/**
 *   node --test --experimental-strip-types lib/anniversary.test.ts
 *
 * Every number on the dashboard comes from this module, and it's the screen
 * someone opens most often. A counter that's quietly one out is worse than
 * one that's obviously broken.
 */

test("days together counts from the start date", () => {
  const a = anniversary("2021-10-14", new Date(2026, 8, 15));
  // 14 Oct 2021 -> 15 Sept 2026
  assert.equal(a.daysTogether, 1797);
});

test("day one reads as zero days, not one", () => {
  const a = anniversary("2026-09-15", new Date(2026, 8, 15));
  assert.equal(a.daysTogether, 0);
});

test("a start date in the future never goes negative", () => {
  // Possible with a typo, or a couple setting a date ahead of a proposal.
  const a = anniversary("2027-01-01", new Date(2026, 8, 15));
  assert.equal(a.daysTogether, 0);
});

test("the next anniversary is the next one that hasn't happened", () => {
  const before = anniversary("2021-10-14", new Date(2026, 8, 15));
  assert.equal(before.nextDate.getFullYear(), 2026);
  assert.equal(before.nextYear, 5);

  // The day after this year's anniversary, it should point at next year's.
  const after = anniversary("2021-10-14", new Date(2026, 9, 15));
  assert.equal(after.nextDate.getFullYear(), 2027);
  assert.equal(after.nextYear, 6);
});

test("the anniversary itself rolls forward rather than reading zero", () => {
  // On the day, the count should already be looking at next year — showing
  // "0 days to year five" on the morning of year five is just wrong.
  const onTheDay = anniversary("2021-10-14", new Date(2026, 9, 14));
  assert.equal(onTheDay.nextDate.getFullYear(), 2027);
  assert.ok(onTheDay.daysUntilNext > 360);
});

test("29 February stays in February", () => {
  // new Date(2027, 1, 29) silently becomes 1 March, which would print the
  // wrong date on the card every non-leap year.
  const a = anniversary("2024-02-29", new Date(2027, 0, 1));

  assert.equal(a.nextDate.getMonth(), 1, "still February");
  assert.equal(a.nextDate.getDate(), 28);
});

test("29 February is itself in a leap year", () => {
  const a = anniversary("2024-02-29", new Date(2028, 0, 1));
  assert.equal(a.nextDate.getMonth(), 1);
  assert.equal(a.nextDate.getDate(), 29);
});

test("progress through the year stays in range", () => {
  for (const day of [1, 100, 200, 364]) {
    const now = new Date(2026, 0, 1);
    now.setDate(now.getDate() + day);

    const a = anniversary("2021-10-14", now);
    assert.ok(a.progress >= 0 && a.progress <= 1, `progress at day ${day}`);
  }
});

test("the first year reads as year one, not year zero", () => {
  const a = anniversary("2026-09-01", new Date(2026, 8, 15));
  assert.equal(a.currentYear, 1);
});

test("greetings change with the hour", () => {
  const at = (hour: number) => greeting(new Date(2026, 8, 15, hour));

  assert.equal(at(2), "Still up");
  assert.equal(at(9), "Good morning");
  assert.equal(at(14), "Good afternoon");
  assert.equal(at(21), "Good evening");
});

test("counts are grouped once they get long", () => {
  assert.equal(formatCount(1238), (1238).toLocaleString());
  assert.equal(formatCount(0), "0");
});
