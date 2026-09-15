import assert from "node:assert/strict";
import { test } from "node:test";

import {
  coverPathFor,
  ordinalYear,
  relationshipYear,
  type Memory,
} from "./memories.ts";

/**
 *   node --test --experimental-strip-types lib/memories.test.ts
 */

function memory(over: Partial<Memory> = {}): Memory {
  return {
    id: "m1",
    title: "A day",
    description: null,
    memory_date: null,
    location: null,
    created_at: "2026-01-01",
    ...over,
  };
}

test("a chosen cover wins over the first image", () => {
  const m = memory({
    memory_media: [
      { id: "a", storage_path: "first.jpg", media_type: "image" },
      { id: "b", storage_path: "chosen.jpg", media_type: "image", is_cover: true },
    ],
  });

  assert.equal(coverPathFor(m), "chosen.jpg");
});

test("without a chosen cover it falls back to the first image", () => {
  const m = memory({
    memory_media: [
      { id: "a", storage_path: "clip.mp4", media_type: "video" },
      { id: "b", storage_path: "first.jpg", media_type: "image" },
    ],
  });

  assert.equal(coverPathFor(m), "first.jpg");
});

test("a memory whose cover was deleted falls back rather than breaking", () => {
  // The flagged row is simply gone; the remaining image takes over.
  const m = memory({
    memory_media: [{ id: "a", storage_path: "first.jpg", media_type: "image" }],
  });

  assert.equal(coverPathFor(m), "first.jpg");
});

test("a video can't be the cover even if it's flagged", () => {
  // Nothing stops the flag being set on a video row, and a <video> in an
  // <img> slot renders as a broken image rather than a poster frame.
  const m = memory({
    memory_media: [
      { id: "a", storage_path: "clip.mp4", media_type: "video", is_cover: true },
      { id: "b", storage_path: "photo.jpg", media_type: "image" },
    ],
  });

  assert.equal(coverPathFor(m), "photo.jpg");
});

test("a memory with no images has no cover", () => {
  assert.equal(coverPathFor(memory()), undefined);
  assert.equal(
    coverPathFor(
      memory({
        memory_media: [{ id: "a", storage_path: "c.mp4", media_type: "video" }],
      })
    ),
    undefined
  );
});

test("the relationship year counts from the start date", () => {
  // Same day as the start: still the first year.
  assert.equal(relationshipYear("2021-10-14", "2021-10-14"), 1);
  // Day before the first anniversary.
  assert.equal(relationshipYear("2022-10-13", "2021-10-14"), 1);
  // The first anniversary itself begins year two.
  assert.equal(relationshipYear("2022-10-14", "2021-10-14"), 2);
  assert.equal(relationshipYear("2023-06-01", "2021-10-14"), 2);
});

test("a memory from before the beginning has no year", () => {
  // The day you met usually predates day one, and "0th year" helps nobody.
  assert.equal(relationshipYear("2020-01-01", "2021-10-14"), null);
});

test("a missing date on either side yields nothing", () => {
  assert.equal(relationshipYear(null, "2021-10-14"), null);
  assert.equal(relationshipYear("2022-01-01", null), null);
});

test("ordinals read correctly, including the teens", () => {
  assert.equal(ordinalYear(1), "1st year");
  assert.equal(ordinalYear(2), "2nd year");
  assert.equal(ordinalYear(3), "3rd year");
  assert.equal(ordinalYear(4), "4th year");
  // The cases a naive implementation gets wrong.
  assert.equal(ordinalYear(11), "11th year");
  assert.equal(ordinalYear(12), "12th year");
  assert.equal(ordinalYear(13), "13th year");
  assert.equal(ordinalYear(21), "21st year");
  assert.equal(ordinalYear(22), "22nd year");
});
