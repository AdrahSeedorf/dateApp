-- ============================================================================
-- Couple profile: chapter, theme, cover
--
-- Everything here is couple-level rather than per-person. The Stitch
-- onboarding design conflated the two into a single "create couple profile"
-- screen; these are the parts that genuinely belong to the pair.
-- ============================================================================

-- Where the relationship is now.
--
-- The most quietly valuable field in the whole design: it changes date
-- generation more than almost anything else already collected. Couples who
-- are dating want to be impressed; couples five years married want something
-- achievable on a Tuesday.
--
-- Nullable, because nobody should be forced to categorise their relationship
-- to use the app.
alter table public.couples
  add column if not exists stage text
    check (stage is null or stage in
      ('dating', 'living_together', 'engaged', 'married'));

-- "Sanctuary Glow". Cosmetic, and validated loosely on purpose: an unknown
-- value falls back to midnight in the UI rather than erroring, so adding a
-- fifth theme later needs no migration.
alter table public.couples
  add column if not exists theme text not null default 'midnight';

-- Shared cover photo. A path in the existing private `memory-media` bucket,
-- under {couple_id}/couple/, which the storage policies from 0001 already
-- scope correctly — they key on the first path segment being the couple id.
alter table public.couples
  add column if not exists cover_path text;

-- ----------------------------------------------------------------------------
-- Chapter changes become milestones
--
-- "Moved in together" and "got engaged" are exactly the entries that belong
-- on the timeline, and asking someone to record the same fact twice is how
-- you end up with a timeline that disagrees with the profile.
--
-- Written as a trigger rather than in application code because the stage can
-- be changed from onboarding or from the profile page, and a rule that lives
-- in one of those will eventually be missing from the other.
-- ----------------------------------------------------------------------------
create or replace function public.milestone_for_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
begin
  -- Only on a real change, and never for the first stage someone picks
  -- during setup: that is a statement about today, not an event.
  if new.stage is null or new.stage is not distinct from old.stage then
    return new;
  end if;

  if old.stage is null then
    return new;
  end if;

  v_title := case new.stage
    when 'living_together' then 'Moved in together'
    when 'engaged'         then 'Got engaged'
    when 'married'         then 'Got married'
    when 'dating'          then null   -- going back is not a milestone
  end;

  if v_title is null then
    return new;
  end if;

  -- Don't duplicate if the couple already marked it themselves.
  if exists (
    select 1 from public.milestones
    where couple_id = new.id
      and source = 'stage_change'
      and title = v_title
  ) then
    return new;
  end if;

  insert into public.milestones (couple_id, title, happened_on, source, icon)
  values (
    new.id,
    v_title,
    current_date,
    'stage_change',
    case new.stage
      when 'living_together' then '🏠'
      when 'engaged'         then '💍'
      when 'married'         then '✨'
    end
  );

  return new;
end;
$$;

drop trigger if exists couples_stage_milestone on public.couples;
create trigger couples_stage_milestone
  after update of stage on public.couples
  for each row execute function public.milestone_for_stage_change();
