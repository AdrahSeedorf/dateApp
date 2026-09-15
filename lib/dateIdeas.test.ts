import assert from "node:assert/strict";
import { test } from "node:test";

import { SURPRISE_LEVELS, surpriseGuidance } from "./dateIdeas.ts";

/**
 *   node --test --experimental-strip-types lib/dateIdeas.test.ts
 */

test("an unknown surprise level falls back to balanced", () => {
  // The value arrives from a form post, so it can be anything.
  const balanced = SURPRISE_LEVELS[1];

  assert.equal(surpriseGuidance(undefined), balanced.guidance);
  assert.equal(surpriseGuidance("nonsense"), balanced.guidance);
  assert.equal(surpriseGuidance(null), balanced.guidance);
});

test("each level gives the model distinct guidance", () => {
  const guidance = SURPRISE_LEVELS.map((level) => level.guidance);
  assert.equal(new Set(guidance).size, SURPRISE_LEVELS.length);

  for (const level of SURPRISE_LEVELS) {
    assert.equal(surpriseGuidance(level.key), level.guidance);
    assert.ok(level.guidance.length > 20, `${level.key} guidance is too thin`);
  }
});
