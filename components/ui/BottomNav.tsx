"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Sparkles, Images, Mail } from "lucide-react";
import { cn } from "./cn";

/**
 * Floating bottom navigation.
 *
 * Icons come from lucide-react, already a dependency, rather than Stitch's
 * Material Symbols font — that would be another render-blocking web font
 * request for a handful of glyphs.
 *
 * Every entry must point at a route that exists — a nav item that 404s is
 * worse than one that isn't there yet. scripts/check-routes.py enforces it.
 *
 * Two items from the Stitch design are deliberately missing. Timeline waits
 * on its screen being built. Companion is the raised centre item, and is not
 * a destination at all: it opens the AI assistant over whatever screen
 * you're on, so it comes back as a button rather than a link once there is
 * an assistant for it to open.
 */

const ITEMS = [
  { href: "/home", label: "Home", Icon: Heart },
  { href: "/dates", label: "Planner", Icon: Sparkles },
  { href: "/memories", label: "Memory", Icon: Images },
  { href: "/letters", label: "Letters", Icon: Mail },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-50 pb-safe px-margin-mobile pointer-events-none"
    >
      <ul className="glass-float pointer-events-auto mx-auto mb-2 flex max-w-md items-center justify-between rounded-full p-space-xs">
        {ITEMS.map(({ href, label, Icon }) => {
          // startsWith so /memories/[id] keeps the Memory tab lit.
          const active = pathname === href || pathname.startsWith(`${href}/`);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] flex-col items-center justify-center gap-0.5 transition-colors",
                  active
                    ? "text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                )}
              >
                <Icon size={22} aria-hidden />
                <span className="text-label-sm">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
