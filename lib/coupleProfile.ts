/**
 * Couple-level profile: chapter, theme, cover.
 *
 * Distinct from `profile_prefs`, which is per person. The rule of thumb:
 * if changing it changes what *both* of you see, it belongs here.
 */

export const STAGES = [
  {
    key: "dating",
    label: "Dating",
    icon: "🌱",
    /** Fed to the date generator — this is the field's real purpose. */
    hint: "Still finding your places.",
  },
  {
    key: "living_together",
    label: "Living together",
    icon: "🏠",
    hint: "Home is the same address.",
  },
  { key: "engaged", label: "Engaged", icon: "💍", hint: "There's a date coming." },
  { key: "married", label: "Married", icon: "✨", hint: "Long game." },
] as const;

export type Stage = (typeof STAGES)[number]["key"];

export const THEMES = [
  { key: "midnight", label: "Midnight", swatch: "#ffb2bf" },
  { key: "sunset", label: "Sunset", swatch: "#ffb59c" },
  { key: "lavender", label: "Lavender", swatch: "#cdbcff" },
  { key: "starlit", label: "Starlit", swatch: "#f2dfb8" },
] as const;

export type Theme = (typeof THEMES)[number]["key"];

const THEME_KEYS = new Set<string>(THEMES.map((t) => t.key));
const STAGE_KEYS = new Set<string>(STAGES.map((s) => s.key));

/**
 * Falls back rather than throwing.
 *
 * A theme that doesn't exist should mean "show the default", not "break the
 * page" — and it makes adding a fifth theme a code change with no migration.
 */
export function safeTheme(value: unknown): Theme {
  return typeof value === "string" && THEME_KEYS.has(value)
    ? (value as Theme)
    : "midnight";
}

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && STAGE_KEYS.has(value);
}

export function stageLabel(value: unknown): string | null {
  const match = STAGES.find((s) => s.key === value);
  return match ? match.label : null;
}

/**
 * How the generator should read the couple's chapter.
 *
 * Kept here rather than inlined in the prompt so the wording can be tuned
 * without touching the API route, and so it's obvious this field has a job
 * beyond decorating the profile.
 */
export function stageGuidance(value: unknown): string | null {
  switch (value) {
    case "dating":
      return "They're still dating — newer places and a bit of occasion suit them.";
    case "living_together":
      return "They live together, so getting out of the house is part of the point.";
    case "engaged":
      return "They're engaged; there's a lot being planned already, so keep this light.";
    case "married":
      return "Married a while — prioritise things that are actually achievable on an ordinary week.";
    default:
      return null;
  }
}

/** Storage path for a couple's cover image, inside the couple's own folder. */
export function coverStoragePath(coupleId: string, fileName: string): string {
  return `${coupleId}/couple/${fileName}`;
}
