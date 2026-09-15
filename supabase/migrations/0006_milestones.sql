-- ============================================================================
-- Milestones
--
-- A milestone is a marked point on the relationship's spine: the day you met,
-- moving in, a trip you still talk about, an anniversary that hasn't happened
-- yet. Distinct from a memory, which is a captured moment with photos — a
-- milestone is structural, and there are few of them.
--
-- Two decisions worth knowing:
--
-- 1. PAST AND FUTURE ARE THE SAME TABLE.
--    "4th anniversary in Amalfi, 246 days away" sits on the same spine as
--    "moved in together". Which side of today a milestone falls on is derived
--    from its date at read time, never stored — a stored flag would be
--    correct on the day it was written and quietly wrong forever after.
--
-- 2. THERE IS NO 'DAY ONE' ROW.
--    The anchor the whole app counts from is couples.started_at, and it stays
--    the only copy. The timeline synthesises the first entry from it rather
--    than duplicating it here, because two sources for the same date is how
--    you end up with a dashboard and a timeline that disagree.
-- ============================================================================

create table if not exists public.milestones (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples(id) on delete cascade,
  created_by  uuid references public.profiles(id) on delete set null,

  title       text not null,
  note        text,

  -- A date, not a timestamp: nobody remembers what time they moved in.
  happened_on date not null,

  -- A single emoji, shown on the node. Cosmetic and optional.
  icon        text,
  place       text,

  -- Optional link to the memory that captured it, so a milestone can open
  -- into photos rather than being a bare line of text.
  memory_id   uuid references public.memories(id) on delete set null,

  -- 'manual'      — someone added it
  -- 'stage_change'— created automatically when the couple's chapter changes
  --                 (dating → living together → engaged → married). Recorded
  --                 so those can be regenerated or cleaned up separately
  --                 without touching anything a person wrote by hand.
  source      text not null default 'manual'
                check (source in ('manual', 'stage_change')),

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- The timeline reads in date order and nothing else does, so this is the
-- only index worth having.
create index if not exists milestones_couple_date_idx
  on public.milestones(couple_id, happened_on);

drop trigger if exists milestones_set_updated_at on public.milestones;
create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
--
-- Simpler than letters: a milestone is shared by definition. Both partners
-- can read, add and edit all of them — there is no notion of one person's
-- private milestone, because a milestone is a fact about the couple.
-- ============================================================================

alter table public.milestones enable row level security;

drop policy if exists "read own milestones" on public.milestones;
create policy "read own milestones"
  on public.milestones for select
  using (couple_id = public.current_couple_id());

drop policy if exists "add milestones" on public.milestones;
create policy "add milestones"
  on public.milestones for insert
  with check (couple_id = public.current_couple_id());

drop policy if exists "edit milestones" on public.milestones;
create policy "edit milestones"
  on public.milestones for update
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

drop policy if exists "remove milestones" on public.milestones;
create policy "remove milestones"
  on public.milestones for delete
  using (couple_id = public.current_couple_id());

grant select, insert, update, delete on public.milestones to authenticated;
