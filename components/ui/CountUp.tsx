"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { formatCount } from "@/lib/anniversary";
import { countAt, planCountUp } from "@/lib/countUp";

type Props = {
  value: number;
  /**
   * Distinguishes counters so two of them don't share a remembered value.
   * Anything stable per counter, per couple.
   */
  storageKey: string;
  className?: string;
};

// Formatting is fixed rather than a prop. It could have been one — but the
// callers are server components, and a function can't cross that boundary:
// it typechecks, lints clean, and throws the moment the page renders.

/**
 * A number that ticks up when it has changed since you last looked.
 *
 * The rules live in `lib/countUp.ts` and are tested there. This file is the
 * browser half: reading what you last saw, running the frames, and putting
 * the real number somewhere a screen reader will find it.
 *
 * Rendered value is the true one on the server, so the number is correct
 * before hydration and never shifts the layout. The animation only ever
 * counts *up to* that number, so the worst case if the JS never arrives is
 * the right answer without ceremony.
 */
export default function CountUp({ value, storageKey, className }: Props) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);

  // Guards against re-running when a server action revalidates the page.
  // Without it the counter would replay every time you sent a nudge.
  const played = useRef(false);

  useEffect(() => {
    if (played.current || reduced) return;
    played.current = true;

    const key = `count-up:${storageKey}`;
    let lastSeen: number | null = null;

    // Storage throws in some privacy modes, and a decorative animation is
    // never worth a crashed dashboard.
    try {
      const raw = window.localStorage.getItem(key);
      lastSeen = raw === null ? null : Number(raw);
    } catch {
      lastSeen = null;
    }

    try {
      window.localStorage.setItem(key, String(value));
    } catch {
      // Not being able to remember means no animation next time. Fine.
    }

    const plan = planCountUp(value, lastSeen);
    if (!plan) return;

    let frame = 0;
    const started = performance.now();

    // No synchronous reset to `plan.from` here: the first frame computes it
    // anyway, and setting state in the effect body would cost a cascading
    // render on every dashboard load to save a single frame.
    const tick = (now: number) => {
      const t = (now - started) / (plan.duration * 1000);
      setDisplay(countAt(plan, value, t));

      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [value, storageKey, reduced]);

  return (
    <span className={className}>
      {/* The animated digits are decoration; the real number is announced
          once, as a fact, rather than read out fourteen times as it moves. */}
      <span className="sr-only">{formatCount(value)}</span>
      <span aria-hidden>{formatCount(display)}</span>
    </span>
  );
}
