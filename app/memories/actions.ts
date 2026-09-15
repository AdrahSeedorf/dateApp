"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";

export type ReflectionState = { error?: string };

const MAX_REFLECTION = 5_000;

/**
 * Adds a note to a memory, after the fact.
 *
 * A private reflection is genuinely private: the read policy filters the row
 * out entirely for the partner, so it does not show up in a count or an
 * aggregate either. See migration 0007 for why it works that way rather than
 * showing a locked placeholder.
 */
export async function addReflection(
  _prev: ReflectionState,
  formData: FormData
): Promise<ReflectionState> {
  const session = await requireOnboarded();
  const supabase = await createClient();

  if (!session.coupleId) return { error: "You're not linked with anyone yet." };

  const memoryId = String(formData.get("memory_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const isPrivate = formData.get("is_private") === "on";

  if (!memoryId) return { error: "Couldn't tell which memory that was." };
  if (!body) return { error: "Nothing written yet." };
  if (body.length > MAX_REFLECTION) {
    return { error: "That's a long one — trim it a little." };
  }

  const { error } = await supabase.from("memory_reflections").insert({
    memory_id: memoryId,
    couple_id: session.coupleId,
    author_id: session.userId,
    body,
    is_private: isPrivate,
  });

  if (error) {
    console.error("[memories] reflection insert failed", error.message);
    return { error: "Couldn't save that. Try again." };
  }

  revalidatePath(`/memories/${memoryId}`);
  return {};
}

export async function deleteReflection(formData: FormData) {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const memoryId = String(formData.get("memory_id") ?? "");
  if (!id) return;

  // RLS limits this to your own reflections; no ownership check needed here.
  const { error } = await supabase
    .from("memory_reflections")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[memories] reflection delete failed", error.message);
  }

  revalidatePath(`/memories/${memoryId}`);
}

/** Favourites are shared — either of you can star a memory. */
export async function toggleFavourite(formData: FormData) {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const next = formData.get("next") === "true";
  if (!id) return;

  const { error } = await supabase
    .from("memories")
    .update({ is_favourite: next })
    .eq("id", id);

  if (error) {
    console.error("[memories] favourite toggle failed", error.message);
  }

  revalidatePath(`/memories/${id}`);
  revalidatePath("/memories");
}
