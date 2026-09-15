"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { MEDIA_BUCKET } from "@/lib/memories";

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

/**
 * Moves a memory to the bin.
 *
 * Not a DELETE: it stays restorable for thirty days. Either partner can do
 * this, which is exactly why it has to be reversible — the vault is shared,
 * so one person can bin something the other one cared about.
 */
export async function deleteMemory(formData: FormData) {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase.rpc("set_memory_deleted", {
    p_memory_id: id,
    p_deleted: true,
  });

  if (error) {
    console.error("[memories] delete failed", error.message);
    return;
  }

  revalidatePath("/memories");
  revalidatePath("/home");
  redirect("/memories?deleted=1");
}

export async function restoreMemory(formData: FormData) {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase.rpc("set_memory_deleted", {
    p_memory_id: id,
    p_deleted: false,
  });

  if (error) {
    console.error("[memories] restore failed", error.message);
    return;
  }

  revalidatePath("/memories");
  revalidatePath("/memories/deleted");
  revalidatePath("/home");
}

/**
 * Removes one photo or video from a memory, for good.
 *
 * Real deletion, unlike a memory: there's no "recently deleted photos" screen
 * worth building, and the file has to leave storage for the deletion to mean
 * anything.
 *
 * Order matters. The row goes first, because a row pointing at a file that
 * no longer exists renders as a broken image on every visit, whereas a file
 * with no row is invisible — wasteful, but harmless, and recoverable by hand.
 */
export async function deleteMedia(formData: FormData) {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const memoryId = String(formData.get("memory_id") ?? "");
  const path = String(formData.get("path") ?? "");

  if (!id || !memoryId) return;

  const { error } = await supabase.from("memory_media").delete().eq("id", id);

  if (error) {
    console.error("[memories] media delete failed", error.message);
    return;
  }

  if (path) {
    const { error: storageError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .remove([path]);

    // Logged, not surfaced: the photo is gone from the app either way, and
    // there is nothing useful the person could do about a stranded file.
    if (storageError) {
      console.error("[memories] storage remove failed", storageError.message);
    }
  }

  revalidatePath(`/memories/${memoryId}`);
  revalidatePath("/memories");
  revalidatePath("/home");
}

/**
 * Picks which image represents a memory.
 *
 * Clears the old one first: the partial unique index allows only one cover
 * per memory, so setting a second without clearing the first would violate
 * it rather than replace it.
 */
export async function setCover(formData: FormData) {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const memoryId = String(formData.get("memory_id") ?? "");
  if (!id || !memoryId) return;

  const { error: clearError } = await supabase
    .from("memory_media")
    .update({ is_cover: false })
    .eq("memory_id", memoryId)
    .eq("is_cover", true);

  if (clearError) {
    console.error("[memories] clear cover failed", clearError.message);
    return;
  }

  const { error } = await supabase
    .from("memory_media")
    .update({ is_cover: true })
    .eq("id", id);

  if (error) {
    console.error("[memories] set cover failed", error.message);
  }

  revalidatePath(`/memories/${memoryId}`);
  revalidatePath("/memories");
  revalidatePath("/home");
}
