"use client";

import { type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { stagger, variantsFor } from "./motion";

type Props = {
  children: ReactNode;
  /** Chrome lifts like light; content settles like paper. */
  as?: "chrome" | "content";
  /** Hold before starting. For sequencing two unrelated regions. */
  delay?: number;
  className?: string;
};

/**
 * Wraps something so it arrives rather than appearing.
 *
 * Deliberately not built into `Card` or `Screen`: motion should be a choice
 * per screen, and a card that always animates would also animate when it
 * re-renders after a server action — which reads as the page flinching every
 * time you press a button.
 */
export default function Appear({
  children,
  as = "content",
  delay = 0,
  className,
}: Props) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variantsFor(as, reduced)}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

type ListProps = {
  children: ReactNode;
  gap?: number;
  className?: string;
};

/**
 * A container whose children arrive one after another.
 *
 * Pair with `AppearItem`. Under reduced motion the stagger collapses to
 * nothing and everything simply fades, because a sequence of movements is
 * exactly what the preference is asking us not to do.
 */
export function AppearList({ children, gap, className }: ListProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={reduced ? undefined : stagger(gap)}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AppearItem({
  children,
  as = "content",
  className,
}: {
  children: ReactNode;
  as?: "chrome" | "content";
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <motion.div variants={variantsFor(as, reduced)} className={className}>
      {children}
    </motion.div>
  );
}
