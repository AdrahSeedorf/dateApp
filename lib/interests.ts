/**
 * Selectable interests, grouped so a long list stays scannable.
 *
 * Fixed values rather than free text: "live music", "Live Music" and "gigs"
 * are three strings meaning one thing, and the generator can't reliably use
 * data shaped like that. Tapping is also far less work than typing, which
 * matters at the point in onboarding where people give up.
 *
 * The list will always miss things, so the form keeps a free-text field
 * alongside it rather than pretending this is complete.
 */
export const INTEREST_GROUPS = [
  {
    label: "Food and drink",
    items: [
      "Coffee",
      "Brunch",
      "Nice dinners",
      "Street food",
      "Wine",
      "Cocktails",
      "Dessert",
      "Cooking together",
    ],
  },
  {
    label: "Outdoors",
    items: [
      "Beaches",
      "Hiking",
      "Parks",
      "Sunsets",
      "Road trips",
      "Camping",
      "Gardens",
      "Being on the water",
    ],
  },
  {
    label: "Culture",
    items: [
      "Live music",
      "Museums",
      "Galleries",
      "Theatre",
      "Cinema",
      "Bookshops",
      "Markets",
      "Comedy",
    ],
  },
  {
    label: "Active",
    items: [
      "Dancing",
      "Cycling",
      "Swimming",
      "Bowling",
      "Climbing",
      "Mini golf",
      "Watching sport",
      "Long walks",
    ],
  },
  {
    label: "Staying in",
    items: [
      "Film nights",
      "Board games",
      "Video games",
      "Puzzles",
      "Baking",
      "Podcasts",
    ],
  },
] as const;

/**
 * Kept separate from interests rather than being their opposite.
 *
 * Things people avoid are usually constraints — crowds, late nights, long
 * drives — not simply interests inverted. Showing the full interest grid a
 * second time would be both overwhelming and the wrong question.
 */
export const AVOID_OPTIONS = [
  "Crowds",
  "Late nights",
  "Alcohol",
  "Spicy food",
  "Long drives",
  "Heights",
  "Deep water",
  "Loud places",
] as const;

export const ALL_INTERESTS: string[] = INTEREST_GROUPS.flatMap(
  (group) => [...group.items]
);

/** Guards against anything that didn't come from the lists above. */
export function keepKnown(values: string[], allowed: readonly string[]): string[] {
  const set = new Set<string>(allowed);
  return [...new Set(values.filter((value) => set.has(value)))];
}
