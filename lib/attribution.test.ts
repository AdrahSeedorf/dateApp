import assert from "node:assert/strict";
import { test } from "node:test";

import {
  attributionIsMeaningful,
  credit,
  isYou,
  nameOf,
  possessive,
  type Viewer,
} from "./attribution.ts";

/**
 *   node --test --experimental-strip-types lib/attribution.test.ts
 */

const ME = "user-me";
const THEM = "user-them";

const viewer: Viewer = { userId: ME, partnerId: THEM, partnerName: "Karina" };
const alone: Viewer = { userId: ME, partnerId: null, partnerName: null };
const nameless: Viewer = { userId: ME, partnerId: THEM, partnerName: null };

test("the reader is always 'You', never their own name", () => {
  assert.equal(nameOf(ME, viewer), "You");
  assert.equal(nameOf(THEM, viewer), "Karina");
});

test("an unknown actor produces nothing, not a placeholder", () => {
  // Everything created before migration 0014 has a null here. The screens
  // have to render that as silence rather than "Someone" or "Them".
  assert.equal(nameOf(null, viewer), null);
  assert.equal(credit(null, "planned this", viewer), null);
  assert.equal(possessive(null, viewer), null);
});

test("a partner with no display name is still not invented", () => {
  assert.equal(nameOf(THEM, nameless), null);
  assert.equal(credit(THEM, "cancelled this", nameless), null);
});

test("a stranger's id is unnameable", () => {
  // A partner who left: the profile is gone, the dates remain.
  assert.equal(nameOf("user-gone", viewer), null);
  assert.equal(isYou("user-gone", viewer), false);
});

test("credit reads as a sentence for either subject", () => {
  assert.equal(credit(ME, "called this off", viewer), "You called this off");
  assert.equal(credit(THEM, "called this off", viewer), "Karina called this off");
});

test("possessive handles the apostrophe cases", () => {
  assert.equal(possessive(ME, viewer), "Your");
  assert.equal(possessive(THEM, viewer), "Karina's");

  const james: Viewer = { userId: ME, partnerId: THEM, partnerName: "James" };
  assert.equal(possessive(THEM, james), "James'");
});

test("isYou is false for null rather than throwing", () => {
  assert.equal(isYou(null, viewer), false);
  assert.equal(isYou(ME, viewer), true);
  assert.equal(isYou(THEM, viewer), false);
});

test("attribution is pointless until someone else has joined", () => {
  assert.equal(attributionIsMeaningful(viewer), true);
  assert.equal(attributionIsMeaningful(alone), false);

  // Still meaningful without a name — the screens fall back to silence per
  // row, but the concept applies.
  assert.equal(attributionIsMeaningful(nameless), true);
});
