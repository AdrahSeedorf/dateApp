"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "./cn";
import { DURATION } from "./motion";

type Props = {
  /** 0–1. Clamped, so a bad computation can't overflow the rail. */
  value: number;
  label: string;
  className?: string;
};

/**
 * Slim gradient progress rail — anniversary countdowns, onboarding steps.
 *
 * Exposed as a real progressbar so the value is announced rather than only
 * drawn; the visible label is what gets read out.
 *
 * It fills on arrival. It had a `transition-[width]` before, which never
 * fired: the correct width was there on the first paint, so there was
 * nothing to transition from. Now it starts empty and runs to the real
 * value once — the difference between a rail that states a fact and one
 * that shows you the year filling up.
 *
 * Only once, though. The fill is driven by state rather than by the render,
 * so revalidating the page after a server action doesn't replay it; the app
 * shouldn't appear to re-measure your relationship every time you press a
 * button.
 */
export default function ProgressRail({ value, label, className }: Props) {
  const reduced = useReducedMotion();
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);

  // Starts true so the server-rendered markup carries the real width. If
  // the JS never runs, the rail is correct rather than empty.
  const [filled, setFilled] = useState(true);
  const played = useRef(false);

  useEffect(() => {
    if (played.current || reduced) return;
    played.current = true;

    // Empty for one frame, then fill. Nested frames because a browser can
    // batch a reset and a restore into the same paint, which skips the
    // transition entirely and leaves the rail simply appearing full.
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      setFilled(false);
      inner = requestAnimationFrame(() =>
        requestAnimationFrame(() => setFilled(true))
      );
    });

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [reduced]);

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        "h-1 w-full rounded-full bg-[var(--glass-rim)] overflow-hidden",
        className
      )}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary"
        style={{
          width: filled ? `${pct}%` : "0%",
          transition: reduced
            ? undefined
            : `width ${DURATION.considered}s cubic-bezier(0.22, 0.61, 0.36, 1)`,
        }}
      />
    </div>
  );
}
