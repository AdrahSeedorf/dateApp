"use client";

import { useState } from "react";
import { cn } from "@/components/ui";

const THEMES = [
  { key: "midnight", label: "Midnight", swatch: "#ffb2bf" },
  { key: "sunset", label: "Sunset", swatch: "#ffb59c" },
  { key: "lavender", label: "Lavender", swatch: "#cdbcff" },
  { key: "starlit", label: "Starlit", swatch: "#f2dfb8" },
] as const;

/**
 * Flips data-theme on <html>.
 *
 * This is the whole mechanism the real Sanctuary Glow picker will use in
 * couple setup — one attribute, no rebuild, no reload. Worth proving here
 * before screens are built on the assumption that it works.
 */
export default function ThemeSwitcher() {
  const [active, setActive] = useState<string>("midnight");

  function apply(key: string) {
    document.documentElement.setAttribute("data-theme", key);
    setActive(key);
  }

  return (
    <div className="glass-float sticky top-4 z-30 mb-space-lg flex items-center gap-space-sm rounded-full p-space-xs">
      <span className="pl-3 text-label-sm text-on-surface-variant">Theme</span>

      {THEMES.map(({ key, label, swatch }) => (
        <button
          key={key}
          type="button"
          onClick={() => apply(key)}
          aria-pressed={active === key}
          className={cn(
            "flex min-h-[44px] items-center gap-2 rounded-full px-3 text-label-sm transition",
            active === key
              ? "bg-[rgb(var(--c-glow-a)/0.18)] text-on-surface"
              : "text-on-surface-variant hover:text-on-surface"
          )}
        >
          <span
            aria-hidden
            className="h-3 w-3 rounded-full"
            style={{ background: swatch }}
          />
          {label}
        </button>
      ))}
    </div>
  );
}
