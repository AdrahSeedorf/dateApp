export type DateIdea = {
  title: string;
  activity: string;
  locationType: string;
  budgetEstimate: string;
  outfitNote: string;
  vibeNote: string;
  /** Per access need, how this plan meets it. Filtered to what you may see. */
  accessibility?: Record<string, string>;
};

export const MOODS = ["Cozy", "Playful", "Romantic", "Adventurous"];
export const BUDGETS = ["Low", "Medium", "High"];
export const SETTINGS = ["Indoor", "Outdoor", "Either"];
export const TIMES = ["A couple hours", "Half a day", "The whole day"];

/**
 * How far from the familiar the plan should go.
 *
 * Stored preferences describe a couple in general; this describes tonight.
 * Without it the generator answers a form filled in months ago, which is why
 * every result feels the same after the third use.
 *
 * Three steps rather than a slider: a slider implies a precision the model
 * cannot deliver, and nobody can tell 60 from 70.
 */
export const SURPRISE_LEVELS = [
  {
    key: "familiar",
    label: "Something we know",
    guidance:
      "Stay close to what they already like. Familiar kinds of places, low risk, nothing that needs explaining.",
  },
  {
    key: "balanced",
    label: "A little new",
    guidance:
      "Mostly familiar, with one element they probably haven't done before.",
  },
  {
    key: "surprise",
    label: "Surprise us",
    guidance:
      "Lean unfamiliar. Suggest something they would not have thought of, as long as it still fits their constraints and budget.",
  },
] as const;

export type SurpriseKey = (typeof SURPRISE_LEVELS)[number]["key"];

export function surpriseGuidance(value: unknown): string {
  const match = SURPRISE_LEVELS.find((level) => level.key === value);
  return (match ?? SURPRISE_LEVELS[1]).guidance;
}

export type GenerateInput = {
  mood: string;
  budget: string;
  setting: string;
  time: string;
  location: string;
  note?: string;
  /** Per-request, unlike the stored preferences. */
  surprise?: SurpriseKey;
  /** Free text, e.g. "after 6" or "Saturday afternoon". */
  window?: string;
};

export type GenerateResult =
  | { ok: true; options: DateIdea[]; accessWarning: boolean }
  | { ok: false; error: string };

/**
 * Shared by the onboarding step and the main generator so the two can't
 * drift apart in how they call the API or handle failure.
 */
export async function generateDateIdeas(
  input: GenerateInput
): Promise<GenerateResult> {
  try {
    const response = await fetch("/api/generate-date", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = await response.json();

    if (!response.ok) {
      return { ok: false, error: data.error ?? "Something went wrong." };
    }

    if (!Array.isArray(data.options) || data.options.length === 0) {
      return { ok: false, error: "No ideas came back. Try again." };
    }

    return {
      ok: true,
      options: data.options,
      accessWarning: Boolean(data.accessWarning),
    };
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the date generator. Check your connection.",
    };
  }
}
