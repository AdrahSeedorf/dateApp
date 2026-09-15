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
  category?: string | null;
  is_favourite?: boolean;
  cover_media_id?: string | null;
  created_at: string;
  memory_media?: MemoryMedia[];
};

export type Reflection = {
  id: string;
  memory_id: string;
  author_id: string;
  body: string;
  is_private: boolean;
  created_at: string;
};

/**
 * Suggested categories.
 *
 * Suggestions, not an enum: the column is free text, the filter is built
 * from what a couple actually uses, and "the Tuesday ones" is a perfectly
 * good category that no schema of mine should have to anticipate.
 */
export const CATEGORY_SUGGESTIONS = [
  "Trips & escapes",
  "Anniversaries",
  "Firsts",
  "Ordinary days",
  "Family",
  "Food",
] as const;

/**
 * The image to show for a memory.
 *
 * Prefers the chosen cover. Falls back to the first image, which is what
 * this used to do implicitly — the difference now is that adding a photo
 * can't silently change the cover of a memory somebody already set.
 */
export function coverPathFor(memory: Memory): string | undefined {
  const media = memory.memory_media ?? [];

  if (memory.cover_media_id) {
    const chosen = media.find((m) => m.id === memory.cover_media_id);
    if (chosen) return chosen.storage_path;
  }

  return media.find((m) => m.media_type === "image")?.storage_path;
}

/**
 * "In your second year" — where a memory sits in the relationship.
 *
 * Returns null when either date is missing, or when the memory predates the
 * start (which is normal: the day you met is usually before day one).
 */
export function relationshipYear(
  memoryDate: string | null,
  startedAt: string | null
): number | null {
  if (!memoryDate || !startedAt) return null;

  const [my, mm, md] = memoryDate.split("-").map(Number);
  const [sy, sm, sd] = startedAt.split("-").map(Number);

  if (!my || !sy) return null;

  const memory = new Date(my, (mm ?? 1) - 1, md ?? 1);
  const start = new Date(sy, (sm ?? 1) - 1, sd ?? 1);

  if (memory < start) return null;

  let years = memory.getFullYear() - start.getFullYear();

  // Not yet reached this year's anniversary, so still in the previous one.
  const beforeAnniversary =
    memory.getMonth() < start.getMonth() ||
    (memory.getMonth() === start.getMonth() &&
      memory.getDate() < start.getDate());

  if (beforeAnniversary) years -= 1;

  return years + 1;
}

export function ordinalYear(year: number): string {
  const suffix =
    year % 100 >= 11 && year % 100 <= 13
      ? "th"
      : year % 10 === 1
        ? "st"
        : year % 10 === 2
          ? "nd"
          : year % 10 === 3
            ? "rd"
            : "th";

  return `${year}${suffix} year`;
}

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
