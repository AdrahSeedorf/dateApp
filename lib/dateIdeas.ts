export type DateIdea = {
  title: string;
  activity: string;
  locationType: string;
  budgetEstimate: string;
  outfitNote: string;
  vibeNote: string;
};

export const MOODS = ["Cozy", "Playful", "Romantic", "Adventurous"];
export const BUDGETS = ["Low", "Medium", "High"];
export const SETTINGS = ["Indoor", "Outdoor", "Either"];
export const TIMES = ["A couple hours", "Half a day", "The whole day"];

export type GenerateInput = {
  mood: string;
  budget: string;
  setting: string;
  time: string;
  location: string;
  note?: string;
};

export type GenerateResult =
  | { ok: true; options: DateIdea[] }
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

    return { ok: true, options: data.options };
  } catch {
    return {
      ok: false,
      error: "Couldn't reach the date generator. Check your connection.",
    };
  }
}
