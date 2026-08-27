"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  MEDIA_BUCKET,
  mediaTypeFor,
  safeFileName,
  type MediaType,
} from "@/lib/memories";

type Props = {
  coupleId: string;
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
        date_plan_id: datePlanId,
        title: title.trim(),
        description: description.trim() || null,
        memory_date: memoryDate || null,
        location: location.trim() || null,
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
    <form
      onSubmit={save}
      className="rounded-3xl border border-pink-300/20 bg-white/5 backdrop-blur-xl p-8"
    >
      <div className="mb-6">
        <label
          htmlFor="title"
          className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
        >
          TITLE
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="First ice cream"
          required
          className="w-full px-5 py-3 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label
            htmlFor="date"
            className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
          >
            DATE
          </label>
          <input
            id="date"
            type="date"
            value={memoryDate}
            onChange={(e) => setMemoryDate(e.target.value)}
            className="w-full px-5 py-3 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white"
          />
        </div>

        <div>
          <label
            htmlFor="location"
            className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
          >
            WHERE
          </label>
          <input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Penrith"
            className="w-full px-5 py-3 rounded-full border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30"
          />
        </div>
      </div>

      <div className="mb-6">
        <label
          htmlFor="description"
          className="block text-white/50 text-sm mb-2 tracking-[0.1em]"
        >
          WHAT HAPPENED
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="The bit you'd want to remember."
          className="w-full px-5 py-3 rounded-2xl border border-white/10 bg-white/5 focus:border-pink-300 focus:outline-none text-sm text-white placeholder:text-white/30 resize-none"
        />
      </div>

      <div className="mb-6">
        <p className="text-white/50 text-sm mb-2 tracking-[0.1em]">
          PHOTOS &amp; VIDEOS
        </p>

        <label className="flex items-center justify-center gap-2 px-5 py-6 rounded-2xl border border-dashed border-white/15 bg-white/5 hover:bg-white/10 hover:border-pink-300/40 transition cursor-pointer text-sm text-white/60">
          <Upload className="w-4 h-4" />
          Choose files
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={(e) => addFiles(e.target.files)}
            className="hidden"
          />
        </label>

        {files.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-4">
            {files.map((pending, index) => (
              <div
                key={`${pending.file.name}-${index}`}
                className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/30"
              >
                {pending.mediaType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pending.previewUrl}
                    alt={pending.file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <video
                    src={pending.previewUrl}
                    className="w-full h-full object-cover"
                  />
                )}

                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-1.5 right-1.5 rounded-full bg-black/70 hover:bg-black p-1 transition"
                  aria-label={`Remove ${pending.file.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {errorMessage && (
        <p className="text-pink-200 text-sm mb-5 break-words">{errorMessage}</p>
      )}

      <button
        type="submit"
        disabled={saving || !title.trim()}
        className="w-full px-6 py-4 rounded-full bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-white/40 transition font-semibold"
      >
        {saving ? progress || "Saving..." : "Save memory"}
      </button>
    </form>
  );
}
