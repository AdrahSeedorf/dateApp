/**
 * The design system's public surface.
 *
 * Screens import from here, never from the individual files. That keeps the
 * set of approved primitives visible in one place, and makes it obvious when
 * someone is reaching for a raw Tailwind colour instead of a token.
 */
export { cn } from "./cn";
export { default as Card } from "./Card";
export { default as Button } from "./Button";
export { Chip, ChipGroup, CheckCard, Pill } from "./Chip";
export { Field, TextArea } from "./Field";
export { default as Screen, ScreenHeader, Section } from "./Screen";
export { Timeline, TimelineItem } from "./Timeline";
export { default as ProgressRail } from "./ProgressRail";
export { default as CountUp } from "./CountUp";
export { default as BottomNav } from "./BottomNav";
export { default as Appear, AppearList, AppearItem } from "./Appear";
export { DURATION, EASE, chrome, content, fade, stagger, variantsFor } from "./motion";
