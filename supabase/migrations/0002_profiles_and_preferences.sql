-- ============================================================================
-- Chunk 1 — profile fields and preferences
--
-- Two ideas kept deliberately separate:
--
--   * profiles          — who you are, shared with your partner by design
--   * profile_prefs     — what should shape a date, owned by you
--
-- The split exists because of access needs. Health and disability
-- information is not the same kind of data as a favourite cuisine, and
-- nobody should have to disclose a condition to a partner as a side effect
-- of using a date app. So preferences are private to their owner by
-- default, with an explicit per-row choice to share.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles: location and onboarding progress
-- ----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists location     text,
  add column if not exists onboarded_at timestamptz,
  -- Resumability. Storing the furthest step reached means someone who
  -- closes the tab at step 4 doesn't restart at step 1.
  add column if not exists onboarding_step text;

-- ----------------------------------------------------------------------------
-- profile_prefs
--
-- One row per person, not per couple: two people in a relationship do not
-- have the same interests, and definitely do not have the same access needs.
-- ----------------------------------------------------------------------------
create table if not exists public.profile_prefs (
  profile_id  uuid primary key references public.profiles(id) on delete cascade,

  -- Free-form but bounded: things they like, things they want to try.
  interests   text[] not null default '{}',
  want_to_try text[] not null default '{}',
  avoid       text[] not null default '{}',

  -- Structured on purpose. A sentence in a notes field is something a model
  -- can quietly drop; discrete values can be enforced after generation.
  -- Expected keys: step_free, seating, quiet, low_sensory, accessible_wc,
  -- assistance_animal, low_energy — each boolean.
  access_needs jsonb not null default '{}'::jsonb,

  -- Anything structured fields don't cover.
  access_notes text,

  -- Whether the partner may see the two access columns above. Interests are
  -- always visible to the partner; access needs are not, unless chosen.
  share_access_with_partner boolean not null default false,

  updated_at  timestamptz not null default now()
);

-- Postgres has no "create trigger if not exists", so drop first. The whole
-- migration is written to be safely re-runnable — pasting it into the SQL
-- editor twice is an easy mistake to make.
drop trigger if exists profile_prefs_set_updated_at on public.profile_prefs;

create trigger profile_prefs_set_updated_at
  before update on public.profile_prefs
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
alter table public.profile_prefs enable row level security;

-- You can always read and write your own.
drop policy if exists "read own prefs" on public.profile_prefs;
create policy "read own prefs"
  on public.profile_prefs for select
  using (profile_id = auth.uid());

drop policy if exists "insert own prefs" on public.profile_prefs;
create policy "insert own prefs"
  on public.profile_prefs for insert
  with check (profile_id = auth.uid());

drop policy if exists "update own prefs" on public.profile_prefs;
create policy "update own prefs"
  on public.profile_prefs for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- Your partner can read your row only if you've opted in.
--
-- Note this is row-level, not column-level: Postgres RLS can't hide
-- individual columns. Sharing therefore means sharing the whole row, which
-- is why interests live here too rather than in a separate shared table —
-- until someone opts in, the partner sees nothing at all. If interests need
-- to be partner-visible independently of access needs, they should move to
-- their own table rather than this policy being loosened.
drop policy if exists "partner reads shared prefs" on public.profile_prefs;
create policy "partner reads shared prefs"
  on public.profile_prefs for select
  using (
    share_access_with_partner
    and profile_id <> auth.uid()
    and exists (
      select 1
      from public.profiles them
      join public.profiles me on me.id = auth.uid()
      where them.id = profile_prefs.profile_id
        and them.couple_id is not null
        and them.couple_id = me.couple_id
    )
  );
