import assert from "node:assert/strict";
import { test } from "node:test";

import {
  awaitingReply,
  isNudgeKind,
  nudgeMeta,
  NUDGE_KINDS,
  timeAgo,
  type Nudge,
} from "./nudges.ts";

/**
 *   node --test --experimental-strip-types lib/nudges.test.ts
 */

const NOW = new Date("2026-09-15T12:00:00Z");

function at(minutesAgo: number): string {
  return new Date(NOW.getTime() - minutesAgo * 60_000).toISOString();
}

test("time ago is coarse, not a delivery receipt", () => {
  assert.equal(timeAgo(at(0), NOW), "just now");
  assert.equal(timeAgo(at(0.5), NOW), "just now");
  assert.equal(timeAgo(at(12), NOW), "12m ago");
  assert.equal(timeAgo(at(60), NOW), "1h ago");
  assert.equal(timeAgo(at(60 * 5), NOW), "5h ago");
  assert.equal(timeAgo(at(60 * 24), NOW), "yesterday");
  assert.equal(timeAgo(at(60 * 24 * 3), NOW), "3 days ago");
});

test("anything older than a week becomes a date", () => {
  const old = timeAgo(at(60 * 24 * 40), NOW);
  assert.notEqual(old, "");
  assert.equal(/ago|yesterday/.test(old), false);
});

test("an unknown kind falls back rather than rendering nothing", () => {
  // The value comes from a database row that a future migration might widen.
  assert.equal(nudgeMeta("not-a-kind").key, NUDGE_KINDS[0].key);
  assert.equal(isNudgeKind("not-a-kind"), false);
  assert.equal(isNudgeKind("kiss"), true);
  assert.equal(isNudgeKind(undefined), false);
});

test("every kind has an emoji and both phrasings", () => {
  for (const kind of NUDGE_KINDS) {
    assert.ok(kind.emoji.length > 0, `${kind.key} needs an emoji`);
    // "A kiss" for sending, "sent you a kiss" for receiving — the card needs
    // both, and a missing one reads as broken copy rather than a crash.
    assert.ok(kind.label.length > 0, `${kind.key} needs a label`);
    assert.ok(kind.received.length > 0, `${kind.key} needs a received phrase`);
  }
});

test("awaiting a reply depends on direction, not on being unseen", () => {
  const base: Nudge = {
    id: "n1",
    from_id: "them",
    to_id: "me",
    kind: "kiss",
    in_reply_to: null,
    seen_at: null,
    created_at: at(5),
  };

  assert.equal(awaitingReply(base, "me"), true);
  assert.equal(awaitingReply({ ...base, from_id: "me", to_id: "them" }, "me"), false);
  assert.equal(awaitingReply(null, "me"), false);
});
