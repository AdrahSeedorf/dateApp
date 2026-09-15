import { type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
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

type OwnProps<T extends ElementType> = {
  children: ReactNode;
  elevation?: Elevation;
  /** Renders the rose-gold halo the spec calls for on interactive cards. */
  interactive?: boolean;
  className?: string;
  /**
   * Render as something else — most often next/link, so a whole card can be
   * one link without nesting an anchor around block content. Props for the
   * target element (href, target, …) are typed through and forwarded.
   */
  as?: T;
};

type Props<T extends ElementType> = OwnProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof OwnProps<T>>;

/**
 * The surface every screen is built from.
 *
 * A note on `flat`: the design system is entirely backdrop-filter glass, which
 * is genuinely expensive to composite. A dozen blurred layers in a scrolling
 * list will drop frames on mid-range phones. Lists get `flat`; hero and
 * focal cards get glass. Same token palette either way, so it reads as one
 * system rather than two.
 */
export default function Card<T extends ElementType = "div">({
  children,
  elevation = "glass",
  interactive = false,
  className,
  as,
  ...rest
}: Props<T>) {
  const Tag = (as ?? "div") as ElementType;

  return (
    <Tag
      className={cn(
        "rounded-xl p-space-lg",
        ELEVATION[elevation],
        interactive &&
          "transition-shadow hover:shadow-[var(--halo-active)] focus-within:shadow-[var(--halo-active)]",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
