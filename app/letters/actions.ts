"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { getPartner } from "@/lib/couple";
import { openLetter, SEAL_COLOURS, type UnlockTrigger } from "@/lib/letters";

export type LetterFormState = { error?: string };

const MAX_TITLE = 120;
const MAX_TEASER = 240;
const MAX_BODY = 20_000;

const SEAL_KEYS = new Set<string>(SEAL_COLOURS.map((s) => s.key));

type Parsed =
  | {
      ok: true;
      title: string;
      teaser: string | null;
      body: string;
      trigger: UnlockTrigger;
      unlockAt: string | null;
      colour: string;
    }
  | { ok: false; error: string };

/**
 * Validates what came off the form.
 *
 * Note what is *not* validated here: whether the letter may be sealed, or by
 * whom. That belongs to the database (migration 0005), and duplicating it
 * would create two versions of the rule that could drift.
 */
function parse(formData: FormData): Parsed {
  const title = String(formData.get("title") ?? "").trim();
  const teaser = String(formData.get("teaser") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const trigger = String(formData.get("unlock_trigger") ?? "date");
  const unlockDate = String(formData.get("unlock_at") ?? "").trim();
  const colour = String(formData.get("colour") ?? "rose");

  if (!title) return { ok: false, error: "Give it a name they'll see." };
  if (title.length > MAX_TITLE) {
    return { ok: false, error: `Keep the name under ${MAX_TITLE} characters.` };
  }
  if (teaser.length > MAX_TEASER) {
    return { ok: false, error: `Keep the note under ${MAX_TEASER} characters.` };
  }
  if (!body) return { ok: false, error: "There's nothing written yet." };
  if (body.length > MAX_BODY) {
    return { ok: false, error: "That's longer than we can store. Trim it a little." };
  }

  if (trigger !== "date" && trigger !== "on_request") {
    return { ok: false, error: "Pick when it should open." };
  }

  let unlockAt: string | null = null;

  if (trigger === "date") {
    if (!unlockDate) {
      return { ok: false, error: "Pick the day it should open." };
    }

    // Midnight local on the chosen day. Stored as an instant, so a letter
    // dated "25 December" opens at the start of their 25th, not ours.
    const parsedDate = new Date(`${unlockDate}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return { ok: false, error: "That date didn't make sense." };
    }

    // The `min` attribute on the input is a hint the browser can be talked
    // out of. Without this check a letter could be sealed with a date
    // already past, arriving openable — which is not a time capsule, it's
    // just a message with extra steps.
    if (parsedDate.getTime() <= Date.now()) {
      return { ok: false, error: "Pick a day that hasn't happened yet." };
    }

    unlockAt = parsedDate.toISOString();
  }

  return {
    ok: true,
    title,
    teaser: teaser || null,
    body,
    trigger,
    unlockAt,
    colour: SEAL_KEYS.has(colour) ? colour : "rose",
  };
}

/**
 * Writes a letter, either as a draft or sealed outright.
 *
 * Sealing is one-way and the database enforces it, so this is the last point
 * at which the words can change. The UI asks for confirmation before calling
 * with seal = true.
 */
export async function saveLetter(
  _prev: LetterFormState,
  formData: FormData
): Promise<LetterFormState> {
  const session = await requireOnboarded();
  const supabase = await createClient();

  if (!session.coupleId) {
    return { error: "You're not linked with anyone yet." };
  }

  const partner = await getPartner(supabase, session.userId, session.coupleId);

  if (!partner) {
    return {
      error:
        "There's nobody to write to yet. Invite them first and this will be waiting.",
    };
  }

  const parsed = parse(formData);
  if (!parsed.ok) return { error: parsed.error };

  const seal = formData.get("intent") === "seal";
  const now = new Date().toISOString();

  const { data: letter, error } = await supabase
    .from("letters")
    .insert({
      couple_id: session.coupleId,
      author_id: session.userId,
      recipient_id: partner.id,
      title: parsed.title,
      teaser: parsed.teaser,
      unlock_trigger: parsed.trigger,
      unlock_at: parsed.unlockAt,
      seal: { colour: parsed.colour },
      status: seal ? "sealed" : "draft",
      sealed_at: seal ? now : null,
    })
    .select("id")
    .single();

  if (error || !letter) {
    console.error("[letters] create failed", error?.message);
    return { error: "Couldn't save that. Try again." };
  }

  // The body is a second write because it lives in its own table — that
  // split is what lets RLS hide it while the countdown stays visible.
  const { error: bodyError } = await supabase
    .from("letter_contents")
    .insert({
      letter_id: letter.id,
      couple_id: session.coupleId,
      body: parsed.body,
    });

  if (bodyError) {
    console.error("[letters] body write failed", bodyError.message);

    // Roll back by hand: a letter with no words is worse than no letter.
    // Only possible while it's still a draft, which is why the body is
    // written before sealing below rather than after.
    await supabase.from("letters").delete().eq("id", letter.id);

    return { error: "Couldn't save what you wrote. Try again." };
  }

  revalidatePath("/letters");
  redirect(seal ? `/letters/${letter.id}?just=sealed` : "/letters");
}

/**
 * Breaks the seal on a letter addressed to the caller.
 *
 * Almost nothing happens here — the database function does the deciding.
 * This exists so the page can revalidate afterwards.
 */
export async function openLetterAction(
  _prev: LetterFormState,
  formData: FormData
): Promise<LetterFormState> {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Couldn't tell which letter that was." };

  const result = await openLetter(supabase, id);

  if (!result.ok) return { error: result.error };

  revalidatePath("/letters");
  revalidatePath(`/letters/${id}`);
  redirect(`/letters/${id}?just=opened`);
}

/** Drafts only — the database refuses anything else. */
export async function deleteDraft(formData: FormData) {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase.from("letters").delete().eq("id", id);

  if (error) {
    console.error("[letters] delete failed", error.message);
  }

  revalidatePath("/letters");
  redirect("/letters");
}
