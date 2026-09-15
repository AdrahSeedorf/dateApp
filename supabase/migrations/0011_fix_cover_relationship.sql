-- ============================================================================
-- Remove the circular relationship between memories and memory_media
--
-- An earlier version of 0007 added `memories.cover_media_id` referencing
-- `memory_media(id)`. Since `memory_media.memory_id` already references
-- `memories(id)`, that made two foreign keys between the same pair of tables
-- pointing opposite ways.
--
-- PostgREST cannot resolve an embed when that is true. Every query of the
-- form `memories?select=...,memory_media(...)` failed outright with:
--
--   Could not embed because more than one relationship was found for
--   'memories' and 'memory_media'
--
-- which took out the memory vault and the dashboard's recent keepsakes in
-- one go. Naming the constraint in each query would work, but it would be a
-- rule every future query had to remember, and forgetting it fails loudly at
-- runtime rather than at review.
--
-- So the relationship goes back to being one-directional, and "is this the
-- cover?" becomes a property of the photo — which is what it always was.
--
-- Safe on a database that never had the column: 0007 now creates `is_cover`
-- directly, and both statements below are guarded.
-- ============================================================================

alter table public.memory_media
  add column if not exists is_cover boolean not null default false;

create unique index if not exists memory_media_one_cover_idx
  on public.memory_media(memory_id)
  where is_cover;

-- Carry across any cover already chosen before dropping the column.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'memories'
      and column_name = 'cover_media_id'
  ) then
    execute '
      update public.memory_media m
      set is_cover = true
      from public.memories mem
      where mem.cover_media_id = m.id
    ';
  end if;
end $$;

alter table public.memories
  drop column if exists cover_media_id;
