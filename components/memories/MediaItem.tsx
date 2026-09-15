"use client";

import { useState } from "react";
import { ImageIcon, Star, Trash2 } from "lucide-react";
import type { MemoryMedia } from "@/lib/memories";
import { deleteMedia, setCover } from "@/app/memories/actions";
import { Button, cn } from "@/components/ui";

type Props = {
  item: MemoryMedia & { id: string };
  memoryId: string;
  url: string;
  alt: string;
};

/**
 * One photo or video, with its controls.
 *
 * Removing a photo is permanent — unlike a memory, which goes to the bin —
 * so it asks first. The confirmation replaces the controls rather than
 * appearing as a dialog: a dialog on a page of photographs is easy to
 * dismiss on reflex, and the whole point is a moment's pause.
 */
export default function MediaItem({ item, memoryId, url, alt }: Props) {
  const [confirming, setConfirming] = useState(false);

  return (
    <figure
      className={cn(
        "overflow-hidden rounded-xl border bg-surface-container-lowest",
        item.is_cover ? "border-tertiary/50" : "border-[var(--glass-rim)]"
      )}
    >
      {item.media_type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} loading="lazy" className="block h-auto w-full" />
      ) : (
        <video src={url} controls playsInline className="block h-auto w-full" />
      )}

      <figcaption className="flex flex-wrap items-center justify-between gap-space-sm p-space-md">
        {confirming ? (
          <>
            <p className="text-body-sm text-on-surface">
              Remove this for good? This one can&apos;t be undone.
            </p>

            <form action={deleteMedia} className="flex gap-space-sm">
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="memory_id" value={memoryId} />
              <input type="hidden" name="path" value={item.storage_path} />

              <Button type="submit" variant="danger" size="sm">
                Remove it
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}
              >
                Keep
              </Button>
            </form>
          </>
        ) : (
          <>
            {/* Only images can be a cover: a video in an <img> slot renders
                as a broken image rather than a poster frame. */}
            {item.media_type === "image" ? (
              item.is_cover ? (
                <span className="flex items-center gap-1.5 text-label-sm text-tertiary">
                  <Star className="h-3.5 w-3.5 fill-tertiary" aria-hidden />
                  Cover
                </span>
              ) : (
                <form action={setCover}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="memory_id" value={memoryId} />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 text-label-sm text-on-surface-variant transition hover:text-tertiary"
                  >
                    <ImageIcon className="h-3.5 w-3.5" aria-hidden />
                    Make this the cover
                  </button>
                </form>
              )
            ) : (
              <span />
            )}

            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="flex items-center gap-1.5 text-label-sm text-on-surface-variant transition hover:text-error"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Remove
            </button>
          </>
        )}
      </figcaption>
    </figure>
  );
}
