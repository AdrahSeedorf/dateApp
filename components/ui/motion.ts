import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion, following the chrome-and-content split in docs/vision.md.
 *
 * Chrome moves like light: it fades and lifts. Content moves like paper: it
 * settles. Neither ever bounces — there is no spring in this file on purpose.
 * This is an app people open in bed at eleven at night, and overshoot reads
 * as a notification demanding attention.
 *
 * Durations are 300–500ms. Faster feels abrupt against the serif; slower
 * starts costing people time on a screen they visit daily.
 *
 * ON REDUCED MOTION. `globals.css` already collapses every animation to
 * 0.01ms for anyone who has asked their OS to stop motion, which covers
 * CSS transitions. Framer Motion animates inline styles and ignores that,
 * so components here use `useReducedMotion()` and drop to a plain fade —
 * not a slow version of the same move. Vestibular triggers are the
 * movement, not the speed.
 */

/** The house curve. Decelerating, never overshooting. */
export const EASE: Transition["ease"] = [0.22, 0.61, 0.36, 1];

export const DURATION = {
  /** Hovers, presses, colour changes. */
  quick: 0.2,
  /** The default: cards arriving, panels opening. */
  settle: 0.35,
  /** Page transitions and ceremonial moments. */
  considered: 0.5,
} as const;

/**
 * Chrome entering: fades and lifts a little, like a light coming up.
 */
export const chrome: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.settle, ease: EASE },
  },
};

/**
 * Content entering: settles into place from slightly above, as a sheet of
 * paper does when it lands. Travels further than chrome and takes longer,
 * because it has weight.
 */
export const content: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.considered, ease: EASE },
  },
};

/** Fade only — the reduced-motion substitute for either of the above. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.quick } },
};

/**
 * A list whose children arrive one after another.
 *
 * 60ms apart: enough to read as a sequence, little enough that a six-card
 * dashboard is fully settled in under half a second. Longer and the last
 * card feels late.
 */
export function stagger(gap = 0.06): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: gap, delayChildren: 0.04 },
    },
  };
}

/** Picks the right variant set for the current motion preference. */
export function variantsFor(
  kind: "chrome" | "content",
  reduced: boolean | null
): Variants {
  if (reduced) return fade;
  return kind === "chrome" ? chrome : content;
}
