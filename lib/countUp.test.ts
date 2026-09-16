import assert from "node:assert/strict";
import { test } from "node:test";

import { countAt, MAX_STEPS, planCountUp } from "./countUp.ts";

/**
 *   node --test --experimental-strip-types lib/countUp.test.ts
 */

test("the first ever visit doesn't animate", () => {
  // Nothing stored means nothing changed as far as we know, and inventing a
  // starting point would be inventing a moment.
  assert.equal(planCountUp(1238, null), null);
});

test("reopening on the same day doesn't animate", () => {
  // The whole point: the dashboard gets opened repeatedly, and only the
  // first open after the number moved is worth marking.
  assert.equal(planCountUp(1238, 1238), null);
});

test("a new day counts the one day", () => {
  const plan = planCountUp(1238, 1237);

  assert.equal(plan?.from, 1237);
  assert.equal(plan?.duration, 0.35, "a single step still gets the floor");
});

test("a week away counts the week", () => {
  const plan = planCountUp(1238, 1231);

  assert.equal(plan?.from, 1231);
  assert.ok(plan!.duration > 0.35 && plan!.duration < 1.3);
});

test("a long absence is clipped rather than replayed", () => {
  const plan = planCountUp(1238, 1000);

  assert.equal(plan?.from, 1238 - MAX_STEPS);

  // The step count is what's clipped; the 1.3s cap is a backstop that the
  // clip means we never actually reach. Both are deliberate — the cap keeps
  // the duration honest if MAX_STEPS ever rises.
  assert.equal(plan?.duration, MAX_STEPS * 0.09);
  assert.ok(plan!.duration <= 1.3);
});

test("a corrected start date never counts backwards", () => {
  // Editing the relationship start date can reduce the total. Running the
  // animation in reverse would read as losing days together.
  assert.equal(planCountUp(1200, 1238), null);
});

test("nonsense in storage is ignored, not rendered", () => {
  assert.equal(planCountUp(1238, NaN), null);
  assert.equal(planCountUp(NaN, 1237), null);
  assert.equal(planCountUp(-5, 1237), null);
});

test("day zero doesn't animate", () => {
  assert.equal(planCountUp(0, null), null);
  assert.equal(planCountUp(0, 0), null);
});

test("the count starts where it says and ends on the real number", () => {
  const plan = planCountUp(1238, 1231)!;

  assert.equal(countAt(plan, 1238, 0), 1231);
  assert.equal(countAt(plan, 1238, 1), 1238);
});

test("the count only ever moves forwards", () => {
  const plan = planCountUp(1238, 1224)!;

  let previous = -Infinity;
  for (let i = 0; i <= 20; i++) {
    const n = countAt(plan, 1238, i / 20);
    assert.ok(n >= previous, `went backwards at t=${i / 20}`);
    previous = n;
  }
});

test("a late frame can't show a day that hasn't happened", () => {
  // requestAnimationFrame overshooting the duration is normal on a busy
  // tab. Clamping matters because the number is a fact, not a decoration.
  const plan = planCountUp(1238, 1237)!;

  assert.equal(countAt(plan, 1238, 1.4), 1238);
  assert.equal(countAt(plan, 1238, -0.2), 1237);
});

test("the curve decelerates rather than running linear", () => {
  const plan = planCountUp(1240, 1200)!; // clipped to 14 steps, from 1226

  const half = countAt(plan, 1240, 0.5);
  const linear = (plan.from + 1240) / 2;

  assert.ok(half > linear, "should be past halfway at the halfway point");
});
