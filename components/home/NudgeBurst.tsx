"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { EASE } from "@/components/ui/motion";

type Props = {
  /** Change this to play the burst. Any stable id for the nudge will do. */
  trigger: string | null;
  emoji: string;
};

/** Six marks, evenly around the circle, at slightly different reaches. */
const SPOKES = Array.from({ length: 6 }, (_, i) => {
  const angle = (i / 6) * Math.PI * 2;
  const reach = 22 + (i % 3) * 5;

  return {
    x: Math.cos(angle) * reach,
    y: Math.sin(angle) * reach,
  };
});

/**
 * The half-second after a nudge lands.
 *
 * A nudge is the smallest thing in the app — one tap that says "thinking of
 * you" — and without a response to the tap it is indistinguishable from a
 * form submission. The burst is the whole feedback loop.
 *
 * Deliberately short and deliberately silent: it plays once, leaves nothing
 * behind, and never repeats on its own. Something that keeps pulsing on the
 * dashboard stops being affection and starts being an unread badge.
 *
 * Nothing at all under reduced motion — this is pure decoration, and the
 * card's text already says what happened.
 */
export default function NudgeBurst({ trigger, emoji }: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <span aria-hidden className="text-3xl leading-none">
        {emoji}
      </span>
    );
  }

  return (
    <span aria-hidden className="relative inline-flex leading-none">
      <motion.span
        key={trigger ?? "still"}
        initial={trigger ? { scale: 0.6 } : false}
        animate={{ scale: 1 }}
        transition={{ duration: 0.45, ease: EASE }}
        className="text-3xl leading-none"
      >
        {emoji}
      </motion.span>

      <AnimatePresence>
        {trigger && (
          <span
            key={trigger}
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            {SPOKES.map((spoke, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0.9, x: 0, y: 0, scale: 1 }}
                animate={{ opacity: 0, x: spoke.x, y: spoke.y, scale: 0.4 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: EASE }}
                className="absolute h-1 w-1 rounded-full bg-primary"
              />
            ))}
          </span>
        )}
      </AnimatePresence>
    </span>
  );
}
