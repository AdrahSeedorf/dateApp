"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Field, TextArea } from "@/components/ui";
import { Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CATEGORY_SUGGESTIONS, MEDIA_BUCKET, mediaTypeFor, safeFileName, type MediaType } from "@/lib/memories";

type Props = {
  coupleId: string;
  /** Recorded so the vault can say who added each memory. */
  userId: string;
  /** Set when this memory is being logged against a saved date plan. */
  datePlanId?: string | null;
  initialTitle?: string;
  initialLocation?: string;
};

type Pending = {
  file: File;
  mediaType: MediaType;
  previewUrl: string;
};

export default function MemoryForm({
  coupleId,
  userId,
  datePlanId = null,
  initialTitle = "",
  initialLocation = "",
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState("");
  const [memoryDate, setMemoryDate] = useState("");
  const [location, setLocation] = useState(initialLocation);
  const [category, setCategory] = useState("");
  const [files, setFiles] = useState<Pending[]>([]);

  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  function addFiles(selected: FileList | null) {
    if (!selected) return;

    const accepted: Pending[] = [];
    const rejected: string[] = [];

    Array.from(selected).forEach((file) => {
      const mediaType = mediaTypeFor(file);

      if (!mediaType) {
        rejected.push(file.name);
        return;
      }

      accepted.push({
        file,
        mediaType,
        previewUrl: URL.createObjectURL(file),
      });
    });

    if (rejected.length > 0) {
      setErrorMessage(
        `Skipped ${rejected.join(", ")} — only images and videos can be added.`
      );
    }

    setFiles((prev) => [...prev, ...accepted]);
  }

  function removeFile(index: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();

    if (!title.trim()) return;

    setSaving(true);
    setErrorMessage("");
    setProgress("Saving...");

    // 1. Create the memory row first — we need its id for the storage path.
    const { data: memory, error: memoryError } = await supabase
      .from("memories")
      .insert({
        couple_id: coupleId,
        created_by: userId,
        date_plan_id: datePlanId,
        title: title.trim(),
        description: description.trim() || null,
        memory_date: memoryDate || null,
        location: location.trim() || null,
        category: category.trim() || null,
      })
      .select("id")
      .single();

    if (memoryError || !memory) {
      console.error("[memory-form] insert failed", memoryError?.message);
      setErrorMessage(
        memoryError?.message ?? "Couldn't save that memory. Try again."
      );
      setSaving(false);
      setProgress("");
      return;
    }

    // 2. Upload each file, then record it.
    for (let i = 0; i < files.length; i++) {
      const { file, mediaType } = files[i];
      setProgress(`Uploading ${i + 1} of ${files.length}...`);

      const path = `${coupleId}/${memory.id}/${safeFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { upsert: false });

      if (uploadError) {
        console.error("[memory-form] upload failed", uploadError.message);
        setErrorMessage(
          `The memory saved, but ${file.name} didn't upload: ${uploadError.message}`
        );
        continue;
      }

      const { error: mediaError } = await supabase.from("memory_media").insert({
        memory_id: memory.id,
        couple_id: coupleId,
        storage_path: path,
        media_type: mediaType,
      });

      if (mediaError) {
        console.error("[memory-form] media row failed", mediaError.message);
        setErrorMessage(
          `${file.name} uploaded but couldn't be linked: ${mediaError.message}`
        );
      }
    }

    setProgress("");
    router.push(`/memories/${memory.id}`);
    router.refresh();
  }

  return (
    <Card as="form" onSubmit={save} className="p-8">
      <div className="space-y-space-lg">
        <Field
          id="title"
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="First ice cream"
          required
        />

        <div className="grid gap-space-md sm:grid-cols-2">
          <Field
            id="date"
            type="date"
            label="Date"
            value={memoryDate}
            onChange={(e) => setMemoryDate(e.target.value)}
          />

          <Field
            id="location"
            label="Where"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Penrith"
          />
        </div>

        {/* A datalist rather than a select: the suggestions are a starting
            point, and a couple's own category ("the Tuesday ones") is worth
            more to them than anything I could put in a fixed list. */}
        <Field
          id="category"
          label="Category (optional)"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Trips & escapes"
          list="memory-categories"
          hint="Used to group the vault. Make up your own if none fit."
        />

        <datalist id="memory-categories">
          {CATEGORY_SUGGESTIONS.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>

        <TextArea
          id="description"
          label="What happened"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="The bit you'd want to remember."
        />

        <div>
          <p className="mb-space-xs text-label-sm text-on-surface-variant tracking-[0.15em]">
            PHOTOS &amp; VIDEOS
          </p>

          <label className="flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--glass-rim-strong)] bg-[var(--glass-1)] px-5 py-6 text-body-md text-on-surface-variant transition hover:border-primary/40 hover:bg-[var(--glass-2)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary">
            <Upload className="h-4 w-4" aria-hidden />
            Choose files
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => addFiles(e.target.files)}
              className="sr-only"
            />
          </label>

          {files.length > 0 && (
            <ul className="mt-space-md grid grid-cols-3 gap-space-sm sm:grid-cols-4">
              {files.map((pending, index) => (
                <li
                  key={`${pending.file.name}-${index}`}
                  className="relative aspect-square overflow-hidden rounded-md border border-[var(--glass-rim)] bg-surface-container-lowest"
                >
                  {pending.mediaType === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pending.previewUrl}
                      alt={pending.file.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video
                      src={pending.previewUrl}
                      className="h-full w-full object-cover"
                    />
                  )}

                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="absolute right-1.5 top-1.5 rounded-full bg-surface/80 p-1.5 text-on-surface transition hover:bg-surface"
                    aria-label={`Remove ${pending.file.name}`}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {errorMessage && (
          <p role="alert" className="break-words text-body-sm text-error">
            {errorMessage}
          </p>
        )}

        {/* Uploads run file by file, so progress is a changing message rather
            than a spinner. Announced politely so it isn't only visual. */}
        <p aria-live="polite" className="sr-only">
          {saving ? progress : ""}
        </p>

        <Button type="submit" fullWidth disabled={saving || !title.trim()}>
          {saving ? progress || "Saving…" : "Save memory"}
        </Button>
      </div>
    </Card>
  );
}
