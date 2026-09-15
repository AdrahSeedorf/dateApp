-- ============================================================================
-- Deleting memories, recoverably
--
-- These are photographs of somebody's life in a vault two people share. A
-- mis-tap should not be the end of one, and neither should a bad evening:
-- either partner can delete, which means either partner can delete something
-- the other one cared about.
--
-- So deletion is a timestamp, not a DELETE. A memory disappears from every
-- screen immediately, stays restorable for thirty days, and is purged after
-- that.
--
-- WHY RLS AND NOT A `WHERE` CLAUSE. The filter lives in the read policy, so
-- a deleted memory is invisible to every query — including ones written
-- later by someone who has never heard of this column. A `.is("deleted_at",
-- null)` in each query would work exactly until the first query that forgot
-- it, and that failure looks like a deleted memory reappearing on the
-- dashboard.
--
-- Individual photos are different and are deleted outright: there is no
-- "recently deleted photos" screen worth building, the storage object has to
-- go for the deletion to be true, and removing one photo from a memory that
-- still exists is a much smaller act than removing the memory.
-- ============================================================================

alter table public.memories
  add column if not exists deleted_at timestamptz;

-- Deleted rows are excluded from the index: the vault only ever reads live
-- ones, and the trash is small enough to scan.
create index if not exists memories_couple_live_idx
  on public.memories(couple_id, memory_date desc)
  where deleted_at is null;

-- ----------------------------------------------------------------------------
-- Reading
--
-- 0001 created a single "same couple" select policy. It gets replaced with a
-- pair, so the ordinary case cannot see deleted rows at all and the trash has
-- to ask for them explicitly through a function.
-- ----------------------------------------------------------------------------
-- The original from 0001, which had no notion of deletion.
drop policy if exists "read couple memories" on public.memories;
drop policy if exists "read live memories" on public.memories;

create policy "read live memories"
  on public.memories for select
  using (
    couple_id = public.current_couple_id()
    and deleted_at is null
  );

/**
 * What's in the bin, newest first.
 *
 * SECURITY DEFINER because the policy above deliberately hides these rows
 * from every ordinary query. This is the one door to them, and it still
 * checks the caller's couple.
 */
create or replace function public.deleted_memories()
returns setof public.memories
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.memories
  where couple_id = public.current_couple_id()
    and deleted_at is not null
  order by deleted_at desc
$$;

grant execute on function public.deleted_memories() to authenticated;

-- ----------------------------------------------------------------------------
-- Deleting and restoring
-- ----------------------------------------------------------------------------

/**
 * Moves a memory to the bin, or takes it back out.
 *
 * 0001's "update couple memories" policy would technically allow both, since
 * an UPDATE is filtered by its own USING clause rather than the read policy.
 * This exists anyway so that binning and restoring are one named operation
 * with one rule, rather than a convention about which column to set — and so
 * a wrong id gives a clear error instead of silently affecting no rows.
 */
create or replace function public.set_memory_deleted(
  p_memory_id uuid,
  p_deleted boolean
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_couple uuid;
begin
  select couple_id into v_couple
  from public.memories
  where id = p_memory_id;

  if not found or v_couple is distinct from public.current_couple_id() then
    -- Same message either way: whether a memory exists in another couple is
    -- not something to confirm.
    raise exception 'Memory not found' using errcode = 'no_data_found';
  end if;

  update public.memories
  set deleted_at = case when p_deleted then now() else null end
  where id = p_memory_id;
end;
$$;

grant execute on function public.set_memory_deleted(uuid, boolean) to authenticated;

/**
 * Permanently removes anything binned more than thirty days ago.
 *
 * Returns the storage paths it destroyed so the caller can delete the files
 * too — Postgres cannot reach into the storage bucket, and a purge that left
 * the images behind would make "deleted" a lie.
 *
 * Called opportunistically when someone opens the bin rather than on a
 * schedule. That is slightly lazy and entirely sufficient: the only cost of
 * a late purge is a row nobody can see living longer than promised.
 */
create or replace function public.purge_deleted_memories()
returns table (storage_path text)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_couple uuid := public.current_couple_id();
begin
  if v_couple is null then
    return;
  end if;

  return query
  with doomed as (
    select id from public.memories
    where couple_id = v_couple
      and deleted_at is not null
      and deleted_at < now() - interval '30 days'
  ),
  paths as (
    -- Collected before the cascade removes them.
    select m.storage_path
    from public.memory_media m
    join doomed d on d.id = m.memory_id
  ),
  removed as (
    delete from public.memories
    where id in (select id from doomed)
    returning 1
  )
  select p.storage_path from paths p;
end;
$$;

grant execute on function public.purge_deleted_memories() to authenticated;

-- ----------------------------------------------------------------------------
-- memory_media
--
-- Deleting a single photo was already permitted by 0001's "delete couple
-- media" policy; there was simply no way to ask for it in the app. That half
-- is UI work, not schema.
--
-- What was genuinely missing is UPDATE. 0007 added `is_cover` to this table
-- and 0011 made it the only way a cover is chosen, but no policy ever allowed
-- writing it — so "make this the cover" would have failed silently, matching
-- zero rows. Caught while adding deletion, which is the sort of thing that
-- stays hidden until someone tries the feature.
-- ----------------------------------------------------------------------------
drop policy if exists "update couple media" on public.memory_media;
create policy "update couple media"
  on public.memory_media for update
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

grant update on public.memory_media to authenticated;
