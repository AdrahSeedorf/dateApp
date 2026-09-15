import { type ButtonHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  /** Romantic action. Gradient fill, dark label, glow on hover. */
  primary:
    "bg-gradient-to-r from-primary to-primary-container text-on-primary font-semibold " +
    "hover:shadow-[0_4px_20px_rgb(var(--c-glow-a)/0.35)]",
  /** Glass action. The workhorse. */
  secondary:
    "bg-[var(--glass-2)] border border-[var(--glass-rim-strong)] text-on-surface " +
    "hover:bg-[var(--glass-1)] backdrop-blur-xl",
  /** Borderless. For tertiary choices that shouldn't compete. */
  ghost: "text-on-surface-variant hover:text-primary",
  /**
   * Destructive. Uses the error role rather than primary so "delete" can
   * never be mistaken for the romantic CTA — they'd otherwise both be pink.
   */
  danger:
    "bg-error-container text-on-error-container border border-error/30 hover:brightness-110",
};

const SIZE: Record<Size, string> = {
  // 44px is the minimum comfortable touch target; the spec's 52px for mobile
  // primary actions is the `md` case.
  sm: "min-h-[44px] px-space-md text-label-md rounded-lg",
  md: "min-h-[52px] px-space-lg text-label-lg rounded-lg",
};

const BASE =
  "inline-flex items-center justify-center gap-space-sm font-body " +
  "transition-all active:scale-[0.98] " +
  "disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";

type Common = {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
};

type Props = Common &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof Common> & {
    /** Renders an anchor instead. Keeps navigation as real links. */
    href?: string;
  };

export default function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  href,
  ...rest
}: Props) {
  const classes = cn(
    BASE,
    VARIANT[variant],
    SIZE[size],
    fullWidth && "w-full",
    className
  );

  // Navigation should be a link, not a button with an onClick: it opens in a
  // new tab on middle-click, it's announced correctly, and it works before
  // hydration. Only render a <button> when something is actually submitted.
  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
