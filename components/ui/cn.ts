/**
 * Joins class names, dropping anything falsy.
 *
 * Deliberately not clsx/tailwind-merge — this app has no class-conflict
 * problem worth a dependency for. If variants ever start fighting over the
 * same property, revisit; until then this is the whole requirement.
 */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}
