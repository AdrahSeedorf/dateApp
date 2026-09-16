import { type ReactNode } from "react";
import { cn } from "./cn";

type Tone = "primary" | "tertiary" | "muted";

const NODE_TONE: Record<Tone, string> = {
  primary: "bg-primary shadow-[0_0_12px_rgb(var(--c-glow-a)/0.6)]",
  /** Champagne gold — reserved for anniversaries and upcoming milestones. */
  tertiary: "bg-tertiary shadow-[0_0_12px_rgb(var(--c-glow-c)/0.6)]",
  muted: "bg-outline",
};

type Props = {
  children: ReactNode;
  className?: string;
};

/**
 * Vertical stem for milestones and multi-stop date itineraries.
 *
 * The stem is drawn as a border on the list rather than an absolutely
 * positioned element, so it grows with content and never desynchronises
 * from the items it's threading.
 */
export function Timeline({ children, className }: Props) {
  return (
    <ol
      className={cn(
        "relative border-l-2 border-[var(--glass-rim)] ml-[7px] pl-space-lg space-y-space-md",
        className
      )}
    >
      {children}
    </ol>
  );
}

type ItemProps = {
  children: ReactNode;
  tone?: Tone;
  className?: string;
};

export function TimelineItem({ children, tone = "primary", className }: ItemProps) {
  return (
    <li className={cn("relative", className)}>
      {/* Concentric node: 16px halo ring around an 8px solid core, straddling
          the stem. The offset is literal rather than calc(var(--spacing-*)):
          those tokens are declared in `@theme inline`, which inlines them
          into utilities instead of emitting custom properties, so they do not
          exist as runtime vars. 33px = 24px padding + 2px border + 7px to
          centre the 16px halo on the stem. aria-hidden because it carries no
          information the item text doesn't already give. */}
      <span
        aria-hidden
        className="absolute -left-[33px] top-1.5
                   w-4 h-4 rounded-full bg-[rgb(var(--c-glow-a)/0.2)]
                   flex items-center justify-center"
      >
        <span className={cn("w-2 h-2 rounded-full", NODE_TONE[tone])} />
      </span>

      {children}
    </li>
  );
}
