"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { DURATION, EASE } from "@/components/ui/motion";

type Props = {
  /**
   * True only on the redirect that follows breaking the seal.
   *
   * Comes from a search param the server action sets, not from comparing
   * `opened_at` to the clock — a letter you opened last March should not
   * re-open itself every time you come back to read it.
   */
  justOpened: boolean;
  children: ReactNode;
};

/**
 * The moment a letter becomes readable.
 *
 * Someone wrote this months ago and has been waiting for you to be allowed
 * to read it. Having the words simply be on the screen when the page
 * reloads throws that away — the pause before is most of what the feature
 * is. So the body lifts in slowly, and the page holds still for a beat
 * first.
 *
 * Every other visit renders with no animation at all, because a letter you
 * have already read is not an event.
 */
export default function Unseal({ justOpened, children }: Props) {
  const reduced = useReducedMotion();

  if (!justOpened) return <>{children}</>;

  if (reduced) {
    // The letter still arrives, it just doesn't travel. A vestibular
    // trigger is the movement, not the timing.
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: DURATION.settle }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        // The longest move in the app, and the only one that waits before
        // starting. Ceremony is mostly the pause.
        duration: 0.9,
        delay: 0.35,
        ease: EASE,
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * The wax seal, at the moment it gives way.
 *
 * Wrapped around the existing seal mark so the break and the body arriving
 * are one gesture: the seal releases, then the letter comes up through the
 * space it left.
 */
export function SealBreak({
  justOpened,
  children,
}: {
  justOpened: boolean;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();

  if (!justOpened || reduced) return <>{children}</>;

  return (
    <motion.div
      initial={{ scale: 1, rotate: 0 }}
      animate={{ scale: [1, 1.08, 0.94], rotate: [0, -4, 3] }}
      transition={{ duration: 0.55, ease: EASE, times: [0, 0.4, 1] }}
      className="shrink-0"
    >
      {children}
    </motion.div>
  );
}
