import { type ReactNode } from "react";
import { cn } from "./cn";

type Props = {
  children: ReactNode;
  /** Leaves room for the floating bottom nav. */
  withNav?: boolean;
  /** Centres a narrow column — onboarding, login, single-question steps. */
  narrow?: boolean;
  className?: string;
};

/**
 * Page shell: ambient background, margins, safe areas.
 *
 * The three radial washes are decorative and sit in their own fixed layer so
 * they don't repaint as content scrolls, and so they can't be picked up as
 * content by assistive tech.
 */
export default function Screen({
  children,
  withNav = false,
  narrow = false,
  className,
}: Props) {
  return (
    <div className="relative min-h-screen bg-surface text-on-surface">
      <div
        aria-hidden
        className="ambient-glow fixed inset-0 pointer-events-none z-0"
      />

      <main
        className={cn(
          "relative z-10 px-margin-mobile pt-safe",
          withNav ? "pb-32" : "pb-space-xl",
          narrow && "mx-auto max-w-md",
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}

type HeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
};

/**
 * Standard page heading.
 *
 * `title` accepts a node rather than a string so callers can italicise part
 * of it — DESIGN.md asks for editorial emphasis on intimate nouns, as in
 * "Good morning, <em>Sarah</em>".
 */
export function ScreenHeader({ eyebrow, title, body, action }: HeaderProps) {
  return (
    <header className="mb-space-lg pt-space-lg">
      <div className="flex items-start justify-between gap-space-md">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-label-sm text-secondary tracking-[0.2em] mb-space-xs">
              {eyebrow.toUpperCase()}
            </p>
          )}

          <h1 className="font-headline text-headline-md md:text-headline-lg text-on-surface text-balance">
            {title}
          </h1>

          {body && (
            <p className="text-body-md text-on-surface-variant mt-space-xs leading-relaxed text-pretty">
              {body}
            </p>
          )}
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

type SectionProps = {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Section({ title, action, children, className }: SectionProps) {
  return (
    <section className={cn("mb-space-lg", className)}>
      {(title || action) && (
        <div className="flex items-baseline justify-between mb-space-sm">
          {title && (
            <h2 className="font-headline text-headline-sm text-on-surface">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
