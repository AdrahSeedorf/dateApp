import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildTimeline,
  describeUpcoming,
  parseDateOnly,
  type Milestone,
} from "./milestones.ts";

/**
 *   node --test --experimental-strip-types lib/milestones.test.ts
 */

const NOW = new Date(2026, 8, 15, 12, 0, 0); // 15 Sept 2026, local

function milestone(over: Partial<Milestone> = {}): Milestone {
  return {
    id: "m1",
    couple_id: "c1",
    title: "Moved in",
    note: null,
    happened_on: "2026-06-01",
    icon: null,
    place: null,
    memory_id: null,
    source: "manual",
    ...over,
  };
}

test("a date-only string parses as local midnight, not UTC", () => {
  // `new Date("2026-09-15")` is parsed as UTC, which is the previous day for
  // anyone west of Greenwich — a milestone would appear to shift by a day
  // depending on where you opened the app.
  const parsed = parseDateOnly("2026-09-15");

  assert.equal(parsed.getFullYear(), 2026);
  assert.equal(parsed.getMonth(), 8);
  assert.equal(parsed.getDate(), 15);
  assert.equal(parsed.getHours(), 0);
});

test("past and future are split by today, and today counts as past", () => {
  const entries = buildTimeline(
    [
      milestone({ id: "a", happened_on: "2020-01-01" }),
      milestone({ id: "b", happened_on: "2026-09-15" }), // today
      milestone({ id: "c", happened_on: "2026-09-16" }), // tomorrow
    ],
    null,
    NOW
  );

  const byId = Object.fromEntries(entries.map((e) => [e.id, e]));

  assert.equal(byId.a.upcoming, false);
  // Something happening today has happened — it shouldn't read "0 days away".
  assert.equal(byId.b.upcoming, false);
  assert.equal(byId.c.upcoming, true);
  assert.equal(byId.c.daysAway, 1);
});

test("the anchor is synthesised from started_at and sorted in", () => {
  const entries = buildTimeline(
    [
      milestone({ id: "later", happened_on: "2023-01-01" }),
      milestone({ id: "earlier", happened_on: "2021-01-01" }),
    ],
    "2022-01-01",
    NOW
  );

  assert.deepEqual(
    entries.map((e) => e.id),
    ["earlier", "anchor", "later"],
    "oldest first, with the anchor in date order rather than pinned"
  );

  const anchor = entries.find((e) => e.anchor);
  assert.ok(anchor);
  assert.equal(anchor.date, "2022-01-01");
});

test("no start date means no anchor, rather than a broken one", () => {
  const entries = buildTimeline([milestone()], null, NOW);

  assert.equal(entries.length, 1);
  assert.equal(
    entries.some((e) => e.anchor),
    false
  );
});

test("an empty timeline is empty, not a lone anchor artefact", () => {
  assert.deepEqual(buildTimeline([], null, NOW), []);
});

test("days away counts whole days from today", () => {
  const entries = buildTimeline(
    [milestone({ happened_on: "2026-12-25" })],
    null,
    NOW
  );

  assert.equal(entries[0].daysAway, 101);
});

test("countdown wording reads naturally at the edges", () => {
  assert.equal(describeUpcoming(0), "Today");
  assert.equal(describeUpcoming(1), "Tomorrow");
  assert.equal(describeUpcoming(246), "246 days away");
});

test("a future start date doesn't break the anchor", () => {
  // Possible while planning ahead, or with a mistyped year.
  const entries = buildTimeline([], "2027-01-01", NOW);

  assert.equal(entries[0].anchor, true);
  assert.equal(entries[0].upcoming, true);
  assert.ok((entries[0].daysAway ?? 0) > 0);
});
