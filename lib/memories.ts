import type { SupabaseClient } from "@supabase/supabase-js";

export const MEDIA_BUCKET = "memory-media";

export type MediaType = "image" | "video";

export type MemoryMedia = {
  id?: string;
  storage_path: string;
  media_type: MediaType;
};

export type Memory = {
  id: string;
  title: string;
  description: string | null;
  memory_date: string | null;
  location: string | null;
  created_at: string;
  memory_media?: MemoryMedia[];
};

/**
 * The bucket is private, so files can't be linked to directly. Signed URLs
 * are short-lived and scoped to a single object.
 */
export async function signPaths(
  supabase: SupabaseClient,
  paths: string[],
  expiresIn = 60 * 60
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter(Boolean))];
  if (unique.length === 0) return {};

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(unique, expiresIn);

  if (error || !data) {
    console.error("[memories] failed to sign media paths", error?.message);
    return {};
  }

  const map: Record<string, string> = {};

  data.forEach((entry) => {
    if (entry.signedUrl && entry.path) {
      map[entry.path] = entry.signedUrl;
    }
  });

  return map;
}

export function formatMemoryDate(value: string | null): string {
  if (!value) return "No date";

  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function mediaTypeFor(file: File): MediaType | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

/** Keeps storage keys predictable and free of characters that break URLs. */
export function safeFileName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return `${Date.now()}-${cleaned || "file"}`;
}
