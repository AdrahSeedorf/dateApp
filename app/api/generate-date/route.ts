import { NextResponse } from "next/server";
import { getCoupleContext } from "@/lib/coupleContext";
import { ACCESS_NEEDS, type AccessNeedKey } from "@/lib/accessNeeds";

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
  /** One line per required access need, explaining how the plan meets it. */
  accessibility?: Record<string, string>;
};

const BASE_PROMPT = `You are a thoughtful, romantic date planner helping a real couple decide what to do together in a specific real-world location. Generate TWO distinct, complete date options grounded in that actual place. Be warm and specific, never generic.

Each option must be fully decisive. Describe ONE specific plan per option — never offer branching choices inside a single option (no "grab lunch at X or Y"). If you're tempted to write "or", that's a sign it should be a second option instead.

The two options should be genuinely different from each other — different pace, setting, or type of experience.

Give each option a short, evocative title (2-5 words, no trailing punctuation).

The personal note, if given, is your most important input. Build the date around it rather than mentioning it in passing.

Ground each plan in real, named places near the given location — actual rivers, parks, trails, lookouts, neighbourhoods or landmarks. Use your knowledge of well-known, stable local geography confidently.

Be careful with business names: only name one if you're reasonably confident it's real and well established there. Otherwise describe the type of place and the area. Never fabricate an address.`;

function accessSection(needs: AccessNeedKey[]): string {
  if (needs.length === 0) return "";

  const lines = ACCESS_NEEDS.filter((need) => needs.includes(need.key)).map(
    (need) =>
      `- ${need.key}: ${need.label}${need.hint ? ` (${need.hint})` : ""}`
  );

  return `

ACCESS REQUIREMENTS — these are hard constraints, not preferences. A plan that fails any of them is unusable, no matter how appealing. Do not suggest something that "mostly" works or that could be adapted. Choose different activities instead.

${lines.join("\n")}

For EVERY requirement listed above, include an entry in "accessibility" keyed by the exact key shown, with one concrete sentence explaining how this specific plan satisfies it. If you cannot satisfy a requirement, pick a different plan — do not explain it away.`;
}

function schema(needs: AccessNeedKey[]): string {
  const accessibility =
    needs.length > 0
      ? `,
      "accessibility": { ${needs.map((k) => `"${k}": "how this plan meets it"`).join(", ")} }`
      : "";

  return `

Respond with ONLY valid JSON in this exact shape — no markdown, no code fences, no commentary:
{
  "options": [
    {
      "title": "short evocative name",
      "activity": "the one specific plan, decisive, 1-2 sentences",
      "locationType": "the kind of place this happens, 1 sentence",
      "budgetEstimate": "rough cost for two, e.g. '$30-50 total'",
      "outfitNote": "short practical suggestion for what to wear",
      "vibeNote": "warm one-liner on why this fits the mood"${accessibility}
    },
    { "...": "second option, same shape" }
  ]
}`;
}

/** Every required need must be addressed, or the option doesn't count. */
function addressesAllNeeds(idea: DateIdea, needs: AccessNeedKey[]): boolean {
  if (needs.length === 0) return true;

  return needs.every((key) => {
    const entry = idea.accessibility?.[key];
    return typeof entry === "string" && entry.trim().length > 0;
  });
}

function parseOptions(rawText: string): DateIdea[] | null {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  const slice =
    first !== -1 && last !== -1 ? cleaned.slice(first, last + 1) : cleaned;

  try {
    const parsed = JSON.parse(slice) as { options?: DateIdea[] };
    return Array.isArray(parsed.options) && parsed.options.length >= 2
      ? parsed.options
      : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not set." },
      { status: 500 }
    );
  }

  // Preferences are read server-side from the session rather than accepted
  // from the request, so they can't be tampered with — access needs in
  // particular must not be something a client can switch off.
  const context = await getCoupleContext();

  if (!context) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: GenerateDateRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { mood, budget, setting, time, location, note } = body;

  if (!mood || !budget || !setting || !time || !location) {
    return NextResponse.json(
      { error: "Missing mood, budget, setting, time, or location." },
      { status: 400 }
    );
  }

  const needs = context.accessNeeds;
  const trimmedNote = note?.trim();

  const preferenceLines = [
    context.interests.length > 0
      ? `They like: ${context.interests.join(", ")}.`
      : "",
    context.wantToTry.length > 0
      ? `They'd like to try: ${context.wantToTry.join(", ")}.`
      : "",
    context.avoid.length > 0
      ? `Avoid entirely: ${context.avoid.join(", ")}.`
      : "",
    context.accessNotes.length > 0
      ? `Also bear in mind: ${context.accessNotes.join(" ")}`
      : "",
  ].filter(Boolean);

  const systemPrompt = BASE_PROMPT + accessSection(needs) + schema(needs);

  const userMessage = [
    `Location: ${location}.`,
    `Mood: ${mood}. Budget: ${budget}. Setting: ${setting}. Time available: ${time}.`,
    ...preferenceLines,
    trimmedNote ? `Personal note from the planner: "${trimmedNote}"` : "",
    "Suggest two distinct, decisive date options grounded in real, named places near this location.",
  ]
    .filter(Boolean)
    .join(" ");

  async function callModel() {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1400,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("[generate-date] anthropic error", response.status, detail);
      return null;
    }

    const data = await response.json();
    return parseOptions(data?.content?.[0]?.text ?? "");
  }

  try {
    let options = await callModel();

    // One retry if any option skipped a required access need. Retrying is
    // cheap; showing someone a date that doesn't work for them isn't.
    if (
      options &&
      needs.length > 0 &&
      !options.every((option) => addressesAllNeeds(option, needs))
    ) {
      console.warn("[generate-date] retrying, access needs unaddressed");
      options = (await callModel()) ?? options;
    }

    if (!options) {
      return NextResponse.json(
        { error: "Couldn't put an idea together. Try again." },
        { status: 502 }
      );
    }

    const usable = options.slice(0, 2);
    const unmet =
      needs.length > 0 &&
      !usable.every((option) => addressesAllNeeds(option, needs));

    // Only ever reveal explanations for needs this person may know about.
    const visible = new Set<string>(context.visibleAccessNeeds);

    const sanitised = usable.map((option) => ({
      ...option,
      accessibility: Object.fromEntries(
        Object.entries(option.accessibility ?? {}).filter(([key]) =>
          visible.has(key)
        )
      ),
    }));

    return NextResponse.json({
      options: sanitised,
      // Surfaced rather than swallowed: if the constraints weren't clearly
      // met, the person should check before relying on it.
      accessWarning: unmet,
    });
  } catch (error) {
    console.error("[generate-date] failed", error);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}
