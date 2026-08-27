import { NextResponse } from "next/server";

type GenerateDateRequest = {
  mood: string;
  budget: string;
  setting: string;
  time: string;
  location: string;
  note?: string;
};

type DateIdea = {
  title: string;
  activity: string;
  locationType: string;
  budgetEstimate: string;
  outfitNote: string;
  vibeNote: string;
};

const SYSTEM_PROMPT = `You are a thoughtful, romantic date planner helping a real couple decide what to do together in a specific real-world location. Given their mood, budget, setting preference, available time, location, and an optional personal note from the person planning the date, generate TWO distinct, complete date options grounded in that actual place. Be warm and specific, never generic.

Each option must be fully decisive. Describe ONE specific plan per option — never offer branching choices inside a single option (no "grab lunch at X or Y", no "try the trail or the canyon if she's up for it"). If you're tempted to write "or", that's a sign it should be a second option instead, not a clause inside the first. Pick the single best specific version of the idea yourself.

The two options should be genuinely different from each other — different pace, setting, or type of experience — not the same idea with the details swapped, so the person planning has a real choice.

Give each option a short, evocative title (2-5 words, no punctuation at the end) that names the date, e.g. "Blue Mountains Adventure Day" or "Quiet Harbourside Evening".

The personal note is your most important input. If one is given, treat it as the whole point of both ideas — build them around it, don't just mention it in passing. If it says something like "she's had a stressful week," design for calm and low effort, not a packed itinerary. If it says "we haven't done anything outdoorsy in a while," lead with that. If it says "I don't know her well yet," design something low-pressure and easy to talk during, rather than a high-stakes gesture. If no note is given, fall back to two thoughtful, well-considered ideas using the mood/budget/setting/time alone — but still avoid generic travel-blog phrasing.

Ground each plan in real, named places near the given location whenever you can — actual rivers, parks, trails, lookouts, neighborhoods, or landmarks (e.g. "watch the sunset at Nepean River" is good, "watch the sunset by a river" is bad). Use your knowledge of well-known, stable local geography confidently.

Be more careful with specific business names (restaurants, cafes, bars): only name one if you're reasonably confident it's a real, well-established place in that area. If you're not sure, describe the type of food and the neighborhood or area to look in instead of inventing a business name (e.g. "a small Italian spot in the town center" rather than making one up). Never fabricate an address.

Respond with ONLY valid JSON matching this exact shape, nothing else — no markdown, no code fences, no commentary:
{
  "options": [
    {
      "title": "a short, evocative name for this date, 2-5 words",
      "activity": "the one specific plan, decisive, no branching choices, 1-2 sentences",
      "locationType": "the kind of place this happens (e.g. 'a quiet rooftop bar' or 'a local botanical garden'), 1 sentence",
      "budgetEstimate": "a rough cost range for two people, e.g. '$30-50 total'",
      "outfitNote": "a short, practical suggestion for what to wear given the mood/setting, 1 sentence",
      "vibeNote": "a warm, romantic one-liner about why this date fits the mood they picked"
    },
    { "title": "...", "activity": "...", "locationType": "...", "budgetEstimate": "...", "outfitNote": "...", "vibeNote": "..." }
  ]
}`;

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not set. Add it to .env.local (or your Vercel project's environment variables) and try again.",
      },
      { status: 500 }
    );
  }

  let body: GenerateDateRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request." },
      { status: 400 }
    );
  }

  const { mood, budget, setting, time, location, note } = body;

  if (!mood || !budget || !setting || !time || !location) {
    return NextResponse.json(
      { error: "Missing mood, budget, setting, time, or location." },
      { status: 400 }
    );
  }

  const trimmedNote = note?.trim();

  const userMessage = `Location: ${location}. Mood: ${mood}. Budget: ${budget}. Setting preference: ${setting}. Time available: ${time}.${
    trimmedNote ? ` Personal note from the planner: "${trimmedNote}"` : ""
  } Suggest two distinct, decisive date options grounded in real, named places in or near this location${
    trimmedNote ? ", built around the personal note above" : ""
  }.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 900,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", response.status, errorText);

      return NextResponse.json(
        { error: "The date generator is having trouble right now. Try again in a moment." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const rawText: string = data?.content?.[0]?.text ?? "";

    // Claude sometimes wraps JSON in a ```json ... ``` fence even when told
    // not to. Strip any fencing and grab the outermost {...} block.
    const cleaned = rawText
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    const jsonSlice =
      firstBrace !== -1 && lastBrace !== -1
        ? cleaned.slice(firstBrace, lastBrace + 1)
        : cleaned;

    let parsed: { options?: DateIdea[] };

    try {
      parsed = JSON.parse(jsonSlice);
    } catch {
      console.error("Failed to parse date idea JSON:", rawText);

      return NextResponse.json(
        { error: "Couldn't quite decode that idea. Try generating again." },
        { status: 502 }
      );
    }

    const options = parsed?.options;

    if (!Array.isArray(options) || options.length < 2) {
      console.error("Unexpected date idea shape:", rawText);

      return NextResponse.json(
        { error: "Couldn't quite decode that idea. Try generating again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ options: options.slice(0, 2) });
  } catch (error) {
    console.error("generate-date route failed:", error);

    return NextResponse.json(
      { error: "Something went wrong generating a date idea. Try again." },
      { status: 500 }
    );
  }
}
