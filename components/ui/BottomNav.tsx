"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Sparkles, Star, Images, Infinity as InfinityIcon } from "lucide-react";
import { cn } from "./cn";

/**
 * Floating bottom navigation.
 *
 * Icons come from lucide-react, already a dependency, rather than Stitch's
 * Material Symbols font — that would be another render-blocking web font
 * request for a handful of glyphs.
 *
 * "Companion" is the raised centre item. It is not a destination: it opens
 * the AI assistant over whatever screen you're on, which is why it has no
 * route of its own.
 */

const ITEMS = [
  { href: "/home", label: "Home", Icon: Heart },
  { href: "/dates", label: "Planner", Icon: Sparkles },
  { href: "/companion", label: "Companion", Icon: Star, center: true },
  { href: "/memories", label: "Memory", Icon: Images },
  { href: "/timeline", label: "Timeline", Icon: InfinityIcon },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-50 pb-safe px-margin-mobile pointer-events-none"
    >
      <ul className="glass-float pointer-events-auto mx-auto mb-2 flex max-w-md items-center justify-between rounded-full p-space-xs">
        {ITEMS.map(({ href, label, Icon, ...rest }) => {
          const center = "center" in rest && rest.center;
          // startsWith so /memories/[id] keeps the Memory tab lit.
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors",
                  center && "-translate-y-2.5",
                  active ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                {center ? (
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-primary via-primary-container to-secondary text-on-primary shadow-[0_4px_20px_rgb(var(--c-glow-a)/0.45)]">
                    <Icon size={22} aria-hidden />
                  </span>
                ) : (
                  <Icon size={22} aria-hidden />
                )}

                <span className={cn("text-label-sm", center && "-mt-0.5 text-primary")}>
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
