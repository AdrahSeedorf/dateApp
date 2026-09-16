"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/lib/auth";
import { MEDIA_BUCKET, safeFileName } from "@/lib/memories";
import type { Role } from "@/lib/datePlans";

export type PlanState = { error?: string };

const MAX_NOTE = 2_000;
const MAX_ROLE_LABEL = 60;
const MAX_ROLES = 12;

/** Every write here also changes the dashboard, so they revalidate together. */
function refresh(planId?: string) {
  revalidatePath("/dates");
  revalidatePath("/home");
  if (planId) revalidatePath(`/dates/${planId}`);
}

/**
 * Reads the roles out of the form.
 *
 * Roles arrive as parallel `role_label` / `role_who` fields, which is how a
 * plain HTML form represents a list. Pairs with an empty label are dropped
 * rather than rejected — a blank row is somebody changing their mind, not an
 * error worth stopping the save for.
 */
function parseRoleFields(formData: FormData): Role[] {
  const labels = formData.getAll("role_label").map(String);
  const whos = formData.getAll("role_who").map(String);

  return labels.flatMap((label, index) => {
    const trimmed = label.trim().slice(0, MAX_ROLE_LABEL);
    if (!trimmed) return [];

    const who = whos[index];
    if (who !== "you" && who !== "them" && who !== "both") return [];

    const role: Role = { label: trimmed, who };
    return [role];
  }).slice(0, MAX_ROLES);
}

/**
 * Saves the planning details and schedules the date.
 *
 * Two writes on purpose. Roles and notes are ordinary columns covered by the
 * existing update policy; the status transition goes through `schedule_date`,
 * which is the only thing allowed to move a plan between states.
 */
export async function planDate(
  _prev: PlanState,
  formData: FormData
): Promise<PlanState> {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const day = String(formData.get("scheduled_for") ?? "").trim();
  const time = String(formData.get("scheduled_time") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!id) return { error: "Couldn't tell which date that was." };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return { error: "Pick a day for it." };
  }

  if (notes.length > MAX_NOTE) {
    return { error: "That note is a bit long — trim it a little." };
  }

  const { error: detailError } = await supabase
    .from("date_plans")
    .update({ roles: parseRoleFields(formData), notes: notes || null })
    .eq("id", id);

  if (detailError) {
    console.error("[dates] detail save failed", detailError.message);
    return { error: "Couldn't save that. Try again." };
  }

  const { error } = await supabase.rpc("schedule_date", {
    p_plan_id: id,
    p_date: day,
    p_time: time || null,
  });

  if (error) {
    console.error("[dates] schedule failed", error.message);

    if (error.message.includes("already started")) {
      return { error: "This one's already underway." };
    }

    return { error: "Couldn't schedule that. Try again." };
  }

  refresh(id);
  redirect(`/dates/${id}?planned=1`);
}

export async function cancelDate(formData: FormData) {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return;

  const { error } = await supabase.rpc("cancel_date", {
    p_plan_id: id,
    p_reason: reason || null,
  });

  if (error) {
    console.error("[dates] cancel failed", error.message);
  }

  refresh(id);
}

/**
 * Starts the evening.
 *
 * The start time is recorded by the database as `now()` — nobody types it,
 * which is the entire point of a start button.
 */
export async function startDate(formData: FormData) {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase.rpc("start_date", { p_plan_id: id });

  if (error) {
    console.error("[dates] start failed", error.message);
    refresh(id);
    return;
  }

  refresh(id);
  redirect(`/dates/${id}/live`);
}

export async function endDate(formData: FormData) {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase.rpc("end_date", { p_plan_id: id });

  if (error) {
    console.error("[dates] end failed", error.message);
    refresh(id);
    return;
  }

  refresh(id);
  // Straight into the wrap-up: the moment the evening ends is the only time
  // anyone will willingly write about it.
  redirect(`/dates/${id}/wrap`);
}

/**
 * Captures something while the date is running.
 *
 * A note, a photo, or both. Kept as light as possible — this runs while two
 * people are standing somewhere, and anything that takes more than a few
 * seconds simply won't be used.
 */
export async function addMoment(
  _prev: PlanState,
  formData: FormData
): Promise<PlanState> {
  const session = await requireOnboarded();
  const supabase = await createClient();

  if (!session.coupleId) return { error: "You're not linked with anyone yet." };

  const planId = String(formData.get("plan_id") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const file = formData.get("photo");

  if (!planId) return { error: "Couldn't tell which date that was." };

  const hasFile = file instanceof File && file.size > 0;

  if (!note && !hasFile) {
    return { error: "Write something or add a photo." };
  }

  let storagePath: string | null = null;
  let mediaType: "image" | "video" | null = null;

  if (hasFile) {
    mediaType = file.type.startsWith("video/") ? "video" : "image";

    // Same folder convention as memories, so the storage policies from 0001
    // apply unchanged — the first path segment is the couple.
    storagePath = `${session.coupleId}/dates/${planId}/${safeFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, file, { upsert: false });

    if (uploadError) {
      console.error("[dates] moment upload failed", uploadError.message);
      return { error: "Couldn't upload that photo. Try again." };
    }
  }

  const { error } = await supabase.from("date_moments").insert({
    date_plan_id: planId,
    couple_id: session.coupleId,
    created_by: session.userId,
    note: note || null,
    storage_path: storagePath,
    media_type: mediaType,
  });

  if (error) {
    console.error("[dates] moment insert failed", error.message);
    return { error: "Couldn't save that. Try again." };
  }

  revalidatePath(`/dates/${planId}/live`);
  return {};
}

export async function deleteMoment(formData: FormData) {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  const planId = String(formData.get("plan_id") ?? "");
  const path = String(formData.get("path") ?? "");
  if (!id) return;

  const { error } = await supabase.from("date_moments").delete().eq("id", id);

  if (error) {
    console.error("[dates] moment delete failed", error.message);
    return;
  }

  if (path) {
    const { error: storageError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .remove([path]);

    if (storageError) {
      console.error("[dates] moment file remove failed", storageError.message);
    }
  }

  revalidatePath(`/dates/${planId}/live`);
  revalidatePath(`/dates/${planId}/wrap`);
}

/** Removes an idea that's never going to happen. */
export async function deletePlan(formData: FormData) {
  await requireOnboarded();
  const supabase = await createClient();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { error } = await supabase.from("date_plans").delete().eq("id", id);

  if (error) {
    console.error("[dates] delete failed", error.message);
    return;
  }

  refresh();
  redirect("/dates");
}

/**
 * Turns a finished date into a memory.
 *
 * The moments captured during the evening become the memory: their notes
 * form the description, their photos move across as media. That is the whole
 * point of collecting them — nobody writes up an evening from memory three
 * days later, but everybody can drop a photo while it's happening.
 *
 * Media rows are re-pointed rather than copied. The file stays exactly where
 * it was uploaded; only the row that references it changes owner. Copying
 * would double the storage for no gain, and re-uploading would be slow on a
 * phone at the end of a night out.
 */
export async function wrapUpDate(
  _prev: PlanState,
  formData: FormData
): Promise<PlanState> {
  const session = await requireOnboarded();
  const supabase = await createClient();

  if (!session.coupleId) return { error: "You're not linked with anyone yet." };

  const planId = String(formData.get("plan_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const memoryDate = String(formData.get("memory_date") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();

  if (!planId) return { error: "Couldn't tell which date that was." };
  if (!title) return { error: "Give it a name." };

  const { data: memory, error } = await supabase
    .from("memories")
    .insert({
      couple_id: session.coupleId,
      created_by: session.userId,
      date_plan_id: planId,
      title,
      description: description || null,
      location: location || null,
      category: category || null,
      memory_date: /^\d{4}-\d{2}-\d{2}$/.test(memoryDate) ? memoryDate : null,
    })
    .select("id")
    .single();

  if (error || !memory) {
    console.error("[dates] wrap-up memory failed", error?.message);
    return { error: "Couldn't save that. Try again." };
  }

  const { data: moments } = await supabase
    .from("date_moments")
    .select("id, storage_path, media_type")
    .eq("date_plan_id", planId)
    .not("storage_path", "is", null)
    .order("created_at", { ascending: true });

  const withMedia = (moments ?? []) as {
    id: string;
    storage_path: string;
    media_type: "image" | "video";
  }[];

  if (withMedia.length > 0) {
    const { error: mediaError } = await supabase.from("memory_media").insert(
      withMedia.map((moment, index) => ({
        memory_id: memory.id,
        couple_id: session.coupleId,
        storage_path: moment.storage_path,
        media_type: moment.media_type,
        // The first photo of the evening becomes the cover unless someone
        // changes it later. Better than no cover, and usually the right one.
        is_cover: index === 0 && moment.media_type === "image",
      }))
    );

    if (mediaError) {
      // Non-fatal: the memory and its words exist, and the photos are still
      // on the date. Losing the whole write-up over a media insert would be
      // a poor trade at the end of a night out.
      console.error("[dates] wrap-up media failed", mediaError.message);
    }
  }

  const { error: linkError } = await supabase
    .from("date_plans")
    .update({ memory_id: memory.id })
    .eq("id", planId);

  if (linkError) {
    console.error("[dates] wrap-up link failed", linkError.message);
  }

  refresh(planId);
  revalidatePath("/memories");
  redirect(`/memories/${memory.id}`);
}
