-- ============================================================================
-- Richer memories, and reflections on them
--
-- Adds the parts of the Stitch memory-vault design that need no external
-- service: a category to filter by, a favourite flag, an explicit cover, and
-- per-person reflections written after the fact.
--
-- Deliberately NOT added here, despite being in the design:
--
--   * weather at the moment of capture — needs a weather API and a key.
--   * latitude/longitude and the "couple footsteps" map — needs a maps
--     provider, and a privacy decision about pinning intimate moments to a
--     street address. Both are recorded in docs/vision.md as build-later.
--
-- Columns are cheap but not free: an unused one is a question every future
-- reader has to answer. These get added when the feature that fills them
-- does.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- memories: category, favourite, explicit cover
-- ----------------------------------------------------------------------------

-- Free text rather than an enum. Couples' categories are their own, an enum
-- would need a migration to extend, and the filter is built from whatever is
-- actually in use. `lib/memories.ts` offers suggestions; it does not limit.
alter table public.memories
  add column if not exists category text;

alter table public.memories
  add column if not exists is_favourite boolean not null default false;

-- Until now the cover was "the first image we happened to get back", which
-- meant it changed when photos were added or reordered. This pins it.
--
-- The flag lives on the media row rather than as `memories.cover_media_id`.
-- That looked more natural but created a second foreign key between
-- `memories` and `memory_media` in the opposite direction, and PostgREST
-- then refuses every embed with "more than one relationship was found" —
-- it cannot tell which of the two an embed means. Being a property of the
-- photo is also simply truer: it is the photo that is the cover.
alter table public.memory_media
  add column if not exists is_cover boolean not null default false;

-- At most one cover per memory, enforced rather than hoped for.
create unique index if not exists memory_media_one_cover_idx
  on public.memory_media(memory_id)
  where is_cover;

create index if not exists memories_couple_favourite_idx
  on public.memories(couple_id, is_favourite)
  where is_favourite;

-- ----------------------------------------------------------------------------
-- memory_reflections
--
-- A note added to a memory later — the thing you remember about that night
-- that you didn't write down at the time. Distinct from the memory's own
-- description, which is the shared account of what happened.
--
-- ON PRIVACY. A reflection can be private, and private here means genuinely
-- invisible: the partner is not told it exists, not shown a count, not given
-- a locked placeholder.
--
-- The Stitch design proposed the opposite — "4 Secret Notes by Leo", visible
-- but sealed. That reads as charming on a mockup and works badly between two
-- real people: a permanent, countable marker of withheld thoughts about a
-- shared moment invites exactly the anxiety this app should not manufacture.
-- A private reflection is a diary entry, and a diary nobody knows the size of
-- is the only kind that stays honest.
-- ----------------------------------------------------------------------------
create table if not exists public.memory_reflections (
  id         uuid primary key default gen_random_uuid(),
  memory_id  uuid not null references public.memories(id) on delete cascade,
  couple_id  uuid not null references public.couples(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,

  body       text not null,
  is_private boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists memory_reflections_memory_idx
  on public.memory_reflections(memory_id, created_at);

drop trigger if exists memory_reflections_set_updated_at
  on public.memory_reflections;
create trigger memory_reflections_set_updated_at
  before update on public.memory_reflections
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.memory_reflections enable row level security;

-- Shared reflections are visible to both; private ones only to their author.
-- Note this is a row filter, so a private reflection does not appear in a
-- count, a length, or an aggregate for the partner. It is not there at all.
drop policy if exists "read reflections" on public.memory_reflections;
create policy "read reflections"
  on public.memory_reflections for select
  using (
    couple_id = public.current_couple_id()
    and (is_private = false or author_id = auth.uid())
  );

drop policy if exists "write own reflections" on public.memory_reflections;
create policy "write own reflections"
  on public.memory_reflections for insert
  with check (
    couple_id = public.current_couple_id()
    and author_id = auth.uid()
  );

-- Your own words stay yours to change, including changing your mind about
-- whether they were private.
drop policy if exists "edit own reflections" on public.memory_reflections;
create policy "edit own reflections"
  on public.memory_reflections for update
  using (
    couple_id = public.current_couple_id()
    and author_id = auth.uid()
  )
  with check (
    couple_id = public.current_couple_id()
    and author_id = auth.uid()
  );

drop policy if exists "delete own reflections" on public.memory_reflections;
create policy "delete own reflections"
  on public.memory_reflections for delete
  using (
    couple_id = public.current_couple_id()
    and author_id = auth.uid()
  );

grant select, insert, update, delete
  on public.memory_reflections to authenticated;
