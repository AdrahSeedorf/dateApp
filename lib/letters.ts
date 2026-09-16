import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Time-capsule letters.
 *
 * The important thing to know when working with this module: a sealed
 * letter's body is not withheld by any code here. It is withheld by row
 * level security in migration 0005. `body` comes back null because the
 * database refused to return it, not because something in TypeScript chose
 * to hide it — which is why the guarantee survives someone bypassing this
 * app entirely.
 *
 * Don't "fix" a null body by fetching it another way.
 */

export type UnlockTrigger = "date" | "on_request";
export type LetterStatus = "draft" | "sealed" | "opened";

/**
 * Wax colours.
 *
 * Fixed values, not theme tokens.
 *
 * These were originally mapped to `bg-primary` / `bg-secondary` / etc. so a
 * seal would "still look right" after a theme change. That was wrong: under
 * the lavender theme, "Bordeaux rose" rendered purple and "Lavender"
 * rendered blue. The names became lies.
 *
 * Wax is a physical object. Bordeaux is bordeaux whatever colour the rest of
 * the app is, and a seal someone chose last year should look the same today.
 * These are the only hardcoded colours in the system, and that is the reason.
 */
export const SEAL_COLOURS = [
  { key: "rose", label: "Bordeaux rose", hex: "#8c2f39", ink: "#ffe4e6" },
  { key: "lavender", label: "Lavender", hex: "#8b7ab8", ink: "#f5f0ff" },
  { key: "champagne", label: "Champagne", hex: "#c8a563", ink: "#3d2f10" },
  { key: "obsidian", label: "Obsidian", hex: "#2b2b33", ink: "#e4e1ee" },
] as const;

export type SealColour = (typeof SEAL_COLOURS)[number]["key"];

const SEAL_KEYS = new Set(SEAL_COLOURS.map((s) => s.key));

/** Falls back rather than throwing: a bad colour is not worth losing a letter over. */
export function sealColour(seal: Record<string, unknown> | null): SealColour {
  const value = seal?.colour;
  return typeof value === "string" && SEAL_KEYS.has(value as SealColour)
    ? (value as SealColour)
    : "rose";
}

/** Inline style for a wax seal, since these deliberately bypass the tokens. */
export function sealStyle(seal: Record<string, unknown> | null): {
  background: string;
  color: string;
} {
  const key = sealColour(seal);
  const match = SEAL_COLOURS.find((s) => s.key === key)!;
  return { background: match.hex, color: match.ink };
}

export type Letter = {
  id: string;
  couple_id: string;
  author_id: string;
  recipient_id: string;
  title: string;
  teaser: string | null;
  status: LetterStatus;
  unlock_trigger: UnlockTrigger;
  unlock_at: string | null;
  sealed_at: string | null;
  opened_at: string | null;
  seal: Record<string, unknown>;
  created_at: string;
};

export type LetterWithBody = Letter & {
  /** Null whenever the reader isn't entitled to it. Never assume a string. */
  body: string | null;
};

const LETTER_COLUMNS =
  "id, couple_id, author_id, recipient_id, title, teaser, status, " +
  "unlock_trigger, unlock_at, sealed_at, opened_at, seal, created_at";

/**
 * The same rule the database enforces, for deciding what to render.
 *
 * Kept deliberately in sync with `letter_is_unlockable()` in migration 0005.
 * If these two ever disagree the database wins — the worst this can do is
 * show an "open it" button that the server then refuses, which is a cosmetic
 * bug rather than a leak.
 */
export function isUnlockable(letter: Letter, now: Date = new Date()): boolean {
  if (letter.status !== "sealed") return false;
  if (letter.unlock_trigger === "on_request") return true;
  if (!letter.unlock_at) return false;

  return new Date(letter.unlock_at) <= now;
}

/**
 * The earliest day a letter may be set to open: tomorrow.
 *
 * A letter that could be opened the moment it was sealed isn't a time
 * capsule. Lives here rather than inline in a component because reading the
 * clock during render is impure — correct for a Server Component, which
 * renders once per request, but not something to write in a component body.
 */
export function earliestUnlockDate(now: Date = new Date()): string {
  const tomorrow = new Date(now.getTime() + 86_400_000);
  return tomorrow.toISOString().slice(0, 10);
}

/** Whole days remaining, or null when there's no date to count towards. */
export function daysUntilUnlock(
  letter: Letter,
  now: Date = new Date()
): number | null {
  if (letter.unlock_trigger !== "date" || !letter.unlock_at) return null;

  const ms = new Date(letter.unlock_at).getTime() - now.getTime();
  if (ms <= 0) return 0;

  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * How a sealed letter describes itself while it is still shut.
 *
 * Never mentions the body. The copy is the one place it would be easy to
 * accidentally leak something, so the only inputs here are the title, the
 * author's own teaser, and the clock.
 *
 * `now` is a parameter for the same reason it is on every other function in
 * this file: without it this read the real clock, so its tests only passed
 * on the day they were written. One of them broke overnight when the date
 * rolled over — an hour of confusion waiting to happen on any day the suite
 * is run.
 */
export function sealedSummary(
  letter: Letter,
  viewerIsAuthor: boolean,
  now: Date = new Date()
): string {
  if (letter.status === "draft") return "Not sent yet";

  if (letter.status === "opened") {
    return viewerIsAuthor ? "They've read this" : "You've opened this";
  }

  if (letter.unlock_trigger === "on_request") {
    return viewerIsAuthor
      ? "Waiting for them to need it"
      : "Yours whenever you need it";
  }

  const days = daysUntilUnlock(letter, now);

  if (days === null) return "Sealed";
  if (days === 0) return "Ready to open";
  if (days === 1) return "1 day left";

  return `${days} days left`;
}

type Client = SupabaseClient;

/**
 * Every letter this person can see, newest first.
 *
 * Two queries rather than a join: the bodies the reader is entitled to come
 * back from a separate table, and letting PostgREST embed it would quietly
 * turn "no body" into "no letter" for sealed rows.
 */
export async function listLetters(
  supabase: Client
): Promise<{ letters: Letter[]; error?: string }> {
  const { data, error } = await supabase
    .from("letters")
    .select(LETTER_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[letters] list failed", error.message);
    return { letters: [], error: "Couldn't load your letters." };
  }

  return { letters: (data ?? []) as unknown as Letter[] };
}

/**
 * One letter, with its body if — and only if — the reader may have it.
 */
export async function getLetter(
  supabase: Client,
  id: string
): Promise<LetterWithBody | null> {
  const { data, error } = await supabase
    .from("letters")
    .select(LETTER_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[letters] fetch failed", error.message);
    return null;
  }

  if (!data) return null;

  const letter = data as unknown as Letter;

  // A miss here is the normal case for a sealed letter, not an error.
  const { data: contents } = await supabase
    .from("letter_contents")
    .select("body")
    .eq("letter_id", id)
    .maybeSingle();

  return { ...letter, body: contents?.body ?? null };
}

/**
 * Breaks the seal.
 *
 * Delegates entirely to the database function, which re-checks who is asking
 * and whether the letter is due. Errors are mapped to plain sentences because
 * Postgres messages ("check_violation") are not something to show a person
 * who was expecting a love letter.
 */
export async function openLetter(
  supabase: Client,
  id: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.rpc("open_letter", { p_letter_id: id });

  if (!error) return { ok: true };

  console.error("[letters] open failed", error.message);

  if (error.message.includes("not ready")) {
    return { ok: false, error: "This one isn't ready to be opened yet." };
  }

  if (error.message.includes("Only the recipient")) {
    return { ok: false, error: "Only the person it's addressed to can open it." };
  }

  return { ok: false, error: "Couldn't open that letter." };
}
