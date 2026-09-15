import assert from "node:assert/strict";
import { test } from "node:test";

import {
  daysUntilUnlock,
  earliestUnlockDate,
  isUnlockable,
  sealColour,
  sealStyle,
  sealedSummary,
  SEAL_COLOURS,
  type Letter,
} from "./letters.ts";

/**
 * Unit tests for the pure half of the letters module.
 *
 *   node --test --experimental-strip-types lib/letters.test.ts
 *
 * The database is the real enforcement (see supabase/tests/0005_letters_test.sql).
 * What is checked here is that the client agrees with it, because a client
 * that disagrees shows an "open it" button on a letter the server will then
 * refuse — or worse, hides one that is genuinely ready.
 */

const NOW = new Date("2026-09-15T12:00:00Z");

function letter(over: Partial<Letter> = {}): Letter {
  return {
    id: "l1",
    couple_id: "c1",
    author_id: "ana",
    recipient_id: "ben",
    title: "A letter",
    teaser: null,
    status: "sealed",
    unlock_trigger: "date",
    unlock_at: "2026-12-25T00:00:00Z",
    sealed_at: "2026-09-01T00:00:00Z",
    opened_at: null,
    seal: {},
    created_at: "2026-09-01T00:00:00Z",
    ...over,
  };
}

test("a dated letter stays shut until its moment", () => {
  assert.equal(isUnlockable(letter(), NOW), false);
  assert.equal(
    isUnlockable(letter({ unlock_at: "2026-09-15T11:59:59Z" }), NOW),
    true
  );
});

test("the boundary is inclusive, matching <= in the SQL", () => {
  assert.equal(
    isUnlockable(letter({ unlock_at: NOW.toISOString() }), NOW),
    true
  );
});

test("an on-request letter is always ready", () => {
  const anytime = letter({ unlock_trigger: "on_request", unlock_at: null });
  assert.equal(isUnlockable(anytime, NOW), true);
});

test("drafts and already-opened letters are not unlockable", () => {
  assert.equal(isUnlockable(letter({ status: "draft" }), NOW), false);
  assert.equal(
    isUnlockable(letter({ status: "opened", opened_at: "2026-09-02" }), NOW),
    false
  );
});

test("a dated letter with no date never opens, rather than opening always", () => {
  // The DB constraint forbids this combination, but a null slipping through
  // must fail closed rather than default to readable.
  assert.equal(isUnlockable(letter({ unlock_at: null }), NOW), false);
});

test("countdown rounds up, so the last partial day still reads as a day", () => {
  assert.equal(
    daysUntilUnlock(letter({ unlock_at: "2026-09-16T06:00:00Z" }), NOW),
    1
  );
  assert.equal(
    daysUntilUnlock(letter({ unlock_at: "2026-09-25T12:00:00Z" }), NOW),
    10
  );
  assert.equal(
    daysUntilUnlock(letter({ unlock_at: "2026-09-14T12:00:00Z" }), NOW),
    0
  );
  assert.equal(
    daysUntilUnlock(letter({ unlock_trigger: "on_request", unlock_at: null }), NOW),
    null
  );
});

test("the sealed summary never reveals anything about the contents", () => {
  const body = "SECRET";
  const l = letter({ teaser: null });

  for (const viewerIsAuthor of [true, false]) {
    const summary = sealedSummary(l, viewerIsAuthor);
    assert.equal(
      summary.includes(body),
      false,
      "summary must not echo body text"
    );
  }
});

test("summaries read correctly from each side", () => {
  const dated = letter({ unlock_at: "2026-09-16T06:00:00Z" });
  assert.equal(sealedSummary(dated, false), "1 day left");

  const due = letter({ unlock_at: "2026-09-14T00:00:00Z" });
  assert.equal(sealedSummary(due, false), "Ready to open");

  const anytime = letter({ unlock_trigger: "on_request", unlock_at: null });
  assert.equal(sealedSummary(anytime, false), "Yours whenever you need it");
  assert.equal(sealedSummary(anytime, true), "Waiting for them to need it");

  const opened = letter({ status: "opened", opened_at: "2026-09-02" });
  assert.equal(sealedSummary(opened, true), "They've read this");
  assert.equal(sealedSummary(opened, false), "You've opened this");

  assert.equal(sealedSummary(letter({ status: "draft" }), true), "Not sent yet");
});

test("the earliest unlock date is tomorrow, not today", () => {
  assert.equal(earliestUnlockDate(NOW), "2026-09-16");

  // A letter dated today could be opened the moment it was sealed, which
  // defeats the entire feature.
  assert.notEqual(earliestUnlockDate(NOW), "2026-09-15");
});

test("a bad seal colour falls back instead of throwing", () => {
  // Losing a letter because someone hand-edited a jsonb field would be a
  // spectacularly bad trade.
  assert.equal(sealColour({ colour: "not-a-colour" }), "rose");
  assert.equal(sealColour({}), "rose");
  assert.equal(sealColour(null), "rose");
  assert.equal(sealColour({ colour: "champagne" }), "champagne");

  assert.ok(sealStyle(null).background);
  assert.ok(sealStyle({ colour: "lavender" }).background);
});

test("wax colours are fixed, not theme tokens", () => {
  // Reversed from an earlier version of this test. Mapping wax to theme
  // tokens meant "Bordeaux rose" rendered purple under the lavender theme —
  // the label and the colour disagreed. Wax doesn't change because the app's
  // palette did.
  for (const seal of SEAL_COLOURS) {
    assert.match(
      seal.hex,
      /^#[0-9a-f]{6}$/i,
      `${seal.key} needs a literal colour`
    );
    assert.match(seal.ink, /^#[0-9a-f]{6}$/i);
  }
});

test("every wax colour is distinct", () => {
  // Two seals that look the same make the picker pointless.
  const hexes = SEAL_COLOURS.map((s) => s.hex.toLowerCase());
  assert.equal(new Set(hexes).size, SEAL_COLOURS.length);
});
