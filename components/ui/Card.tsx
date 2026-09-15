import { type ElementType, type ReactNode } from "react";
import { cn } from "./cn";

type Elevation = "flat" | "glass" | "raised" | "float";

const ELEVATION: Record<Elevation, string> = {
  /** Solid container. Cheapest to paint — use for long lists. */
  flat: "bg-surface-container border border-outline-variant/40",
  /** Layer 1: static frosted card. The default. */
  glass: "glass",
  /** Layer 2: active or interactive surface. */
  raised: "glass-raised",
  /** Layer 3: floating sheets and popovers. */
  float: "glass-float",
};

type Props = {
  children: ReactNode;
  elevation?: Elevation;
  /** Renders the rose-gold halo the spec calls for on interactive cards. */
  interactive?: boolean;
  className?: string;
  as?: ElementType;
};

/**
 * The surface every screen is built from.
 *
 * A note on `flat`: the design system is entirely backdrop-filter glass, which
 * is genuinely expensive to composite. A dozen blurred layers in a scrolling
 * list will drop frames on mid-range phones. Lists get `flat`; hero and
 * focal cards get glass. Same token palette either way, so it reads as one
 * system rather than two.
 */
export default function Card({
  children,
  elevation = "glass",
  interactive = false,
  className,
  as: Tag = "div",
}: Props) {
  return (
    <Tag
      className={cn(
        "rounded-xl p-space-lg",
        ELEVATION[elevation],
        interactive &&
          "transition-shadow hover:shadow-[var(--halo-active)] focus-within:shadow-[var(--halo-active)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}
