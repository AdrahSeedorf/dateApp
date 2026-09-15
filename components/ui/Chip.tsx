import { type ReactNode } from "react";
import { cn } from "./cn";

const CHIP_BASE =
  "block px-4 py-2 rounded-full text-label-md font-body transition select-none " +
  "border border-[var(--glass-rim)] bg-[var(--glass-1)] text-on-surface-variant " +
  "hover:bg-[var(--glass-2)] hover:text-on-surface";

/**
 * Selected state: rose-gold glass fill with a solid primary rim.
 *
 * Note the ring is on the border, not colour alone. Someone with a colour
 * vision deficiency can still tell which chips are on, which matters here
 * because chips are how interests, access needs and vibe are all chosen.
 */
const CHIP_SELECTED =
  "peer-checked:border-primary peer-checked:bg-[rgb(var(--c-glow-a)/0.18)] " +
  "peer-checked:text-on-surface peer-checked:font-semibold " +
  "peer-focus-visible:outline peer-focus-visible:outline-2 " +
  "peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary";

type ChipProps = {
  name: string;
  value: string;
  children: ReactNode;
  /** checkbox for many-of, radio for one-of. */
  type?: "checkbox" | "radio";
  defaultChecked?: boolean;
  className?: string;
};

/**
 * A chip backed by a real form input.
 *
 * No React state: the enclosing form is submitted to a server action, so
 * there is nothing to synchronise, selections survive a failed submit, and
 * the control is keyboard- and screen-reader-native for free.
 */
export function Chip({
  name,
  value,
  children,
  type = "checkbox",
  defaultChecked = false,
  className,
}: ChipProps) {
  return (
    <label className={cn("cursor-pointer", className)}>
      <input
        type={type}
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="sr-only peer"
      />
      <span className={cn(CHIP_BASE, CHIP_SELECTED)}>{children}</span>
    </label>
  );
}

type GroupProps = {
  legend?: string;
  children: ReactNode;
  /** Horizontal scroll instead of wrapping — for mood rows and filters. */
  scroll?: boolean;
  className?: string;
};

export function ChipGroup({ legend, children, scroll, className }: GroupProps) {
  return (
    <fieldset className={cn("border-0 p-0 m-0", className)}>
      {legend && (
        <legend className="text-label-sm text-on-surface-variant tracking-[0.15em] mb-space-sm">
          {legend.toUpperCase()}
        </legend>
      )}
      <div
        className={cn(
          "flex gap-space-sm",
          scroll
            ? "overflow-x-auto scrollbar-none pb-1 [&>*]:shrink-0"
            : "flex-wrap"
        )}
      >
        {children}
      </div>
    </fieldset>
  );
}

type CheckCardProps = {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  value?: string;
  defaultChecked?: boolean;
  className?: string;
};

/**
 * A checkbox with a label and supporting text, in a tappable card.
 *
 * For choices that need explaining — access needs, privacy switches — where
 * a bare chip wouldn't carry enough context. The whole card is the target
 * rather than just the 16px box.
 *
 * The native checkbox is kept visible (rather than hidden behind a styled
 * span as Chip does) because these are genuinely consequential settings, and
 * a real checkbox is unambiguous about its state in every assistive tool.
 */
export function CheckCard({
  name,
  label,
  hint,
  value,
  defaultChecked = false,
  className,
}: CheckCardProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg p-space-md transition",
        "border border-[var(--glass-rim)] bg-[var(--glass-1)] hover:bg-[var(--glass-2)]",
        "has-[:checked]:border-primary has-[:checked]:bg-[rgb(var(--c-glow-a)/0.12)]",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
        className
      )}
    >
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--c-primary)]"
      />
      <span className="min-w-0">
        <span className="block text-body-md text-on-surface">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-body-sm text-on-surface-variant leading-relaxed">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

type PillProps = {
  children: ReactNode;
  tone?: "neutral" | "primary" | "secondary" | "tertiary";
  /** Pulsing dot for live/active status. Respects reduced-motion globally. */
  dot?: boolean;
  className?: string;
};

const PILL_TONE = {
  neutral: "bg-surface-container-high text-on-surface-variant",
  primary: "bg-[rgb(var(--c-glow-a)/0.18)] text-primary",
  secondary: "bg-secondary-container text-on-secondary-container",
  tertiary: "bg-[rgb(var(--c-glow-c)/0.18)] text-tertiary",
} as const;

/** Read-only status badge. Not interactive — use Chip when it's a control. */
export function Pill({ children, tone = "neutral", dot, className }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-label-sm font-body",
        PILL_TONE[tone],
        className
      )}
    >
      {dot && (
        <span
          aria-hidden
          className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"
        />
      )}
      {children}
    </span>
  );
}
