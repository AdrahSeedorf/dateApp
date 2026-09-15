-- ============================================================================
-- CATCH-UP: migrations 0002 through 0010, in order.
--
-- Paste this whole file into the Supabase SQL editor and run it once.
--
-- Safe to run whatever state the database is in. Every statement from 0002
-- onwards is guarded (add column if not exists, create table if not exists,
-- drop policy if exists before create), so anything already applied is a
-- no-op rather than an error.
--
-- 0001_init.sql is deliberately NOT included: it creates tables outright and
-- would fail with "relation already exists". If your database has no tables
-- at all, run 0001 on its own first, then this.
--
-- Generated from the individual files in supabase/migrations/ — edit those,
-- not this.
-- ============================================================================



-- ####################  0002_profiles_and_preferences.sql  ####################

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


-- ####################  0003_couple_creation.sql  ####################

-- ============================================================================
-- Chunk 4 — let a signed-in person create their own couple
--
-- 0001 gave `couples` select and update policies but no insert, because at
-- the time every couple was created by hand in SQL. Self-serve onboarding
-- needs someone to be able to create the container they're about to put a
-- date plan into.
--
-- Additive only, so it's safe to run before the matching code deploys.
-- ============================================================================

drop policy if exists "create a couple" on public.couples;

-- Any signed-in person may create a couple. There's nothing to check
-- against: it's an empty container until they attach their own profile to
-- it, and the profiles update policy already restricts that to themselves.
create policy "create a couple"
  on public.couples for insert
  to authenticated
  with check (true);


-- ####################  0004_onboarding_path.sql  ####################

-- ============================================================================
-- Chunk 8 — remember which onboarding path someone is on
--
-- The person who starts an account and the person they invite need different
-- flows. The invited partner shouldn't be asked to generate a first date
-- (their partner already did) or to invite someone (they were the invite).
--
-- Stored rather than inferred: "does this couple already have a member?" is
-- true at redemption time but stops being a reliable signal the moment
-- anything else changes, and onboarding must not shift under someone
-- halfway through.
--
-- Additive, so it's safe to run before the matching code deploys. Existing
-- rows stay null, which reads as the creator path — correct for everyone
-- who exists today.
-- ============================================================================

alter table public.profiles
  add column if not exists onboarding_path text;


-- ####################  0005_letters.sql  ####################

-- ============================================================================
-- Time-capsule letters
--
-- A letter is written now and read later. The whole feature rests on one
-- promise: the recipient cannot read it before it opens. If that promise can
-- be broken the feature is worthless, so it is enforced by the database
-- rather than by the UI.
--
-- Three decisions worth understanding before changing anything here:
--
-- 1. THE BODY LIVES IN ITS OWN TABLE.
--    RLS filters rows, not columns. The recipient must see a sealed letter's
--    title and countdown while being unable to read its body, and that is
--    impossible if both live in the same row. So `letters` holds metadata
--    (visible to both) and `letter_contents` holds the words (gated).
--
-- 2. THE RECIPIENT HAS NO UPDATE POLICY AT ALL.
--    Opening happens through open_letter(), a SECURITY DEFINER function that
--    checks eligibility itself. If the recipient could UPDATE the row they
--    could also rewrite unlock_at and open anything instantly — and RLS has
--    no column-level granularity to prevent that.
--
-- 3. SEALING IS ONE-WAY.
--    Once sealed, neither person can edit the body. An author who could
--    rewrite a sealed letter makes "sealed on 2 Sept" a lie, and the whole
--    keepsake quality of the thing depends on it being genuinely fixed.
--
-- Deliberately NOT implemented: the Stitch design offers a GPS unlock
-- ("unlocks when GPS detects arrival in Rome"). That needs continuous
-- location tracking of a partner, which is not a trade this product should
-- make for a nice animation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- letters — metadata. Readable by both partners once sealed.
-- ----------------------------------------------------------------------------
create table if not exists public.letters (
  id            uuid primary key default gen_random_uuid(),
  couple_id     uuid not null references public.couples(id) on delete cascade,
  author_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,

  -- What the recipient sees on the sealed card.
  title         text not null,
  -- An optional line shown while still sealed ("Don't peek until...").
  teaser        text,

  status        text not null default 'draft'
                  check (status in ('draft', 'sealed', 'opened')),

  -- How this letter earns its opening.
  --   date       — a moment in time. The countdown case.
  --   on_request — no date. Held until the recipient asks for one, which is
  --                how "open on a tough day" works: written in advance,
  --                delivered at the worst possible moment, by their choice.
  unlock_trigger text not null default 'date'
                  check (unlock_trigger in ('date', 'on_request')),

  -- Required for 'date', meaningless for 'on_request'. Enforced below.
  unlock_at     timestamptz,

  sealed_at     timestamptz,
  opened_at     timestamptz,

  -- Cosmetic: wax colour, stationery, font. Kept as jsonb because it is
  -- pure presentation and will churn while the design settles.
  seal          jsonb not null default '{}'::jsonb,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- A letter to yourself is not what this feature is for, and allowing it
  -- would make the author/recipient policies overlap in confusing ways.
  constraint letters_not_self check (author_id <> recipient_id),

  -- A dated letter without a date would be unopenable forever.
  constraint letters_date_needs_unlock_at check (
    unlock_trigger <> 'date' or unlock_at is not null
  ),

  -- Status and timestamps must agree, so no code path can leave a letter
  -- "opened" with no record of when, or sealed without a sealing time.
  constraint letters_sealed_has_timestamp check (
    status = 'draft' or sealed_at is not null
  ),
  constraint letters_opened_has_timestamp check (
    (status = 'opened') = (opened_at is not null)
  )
);

create index if not exists letters_couple_idx
  on public.letters(couple_id, created_at desc);

create index if not exists letters_recipient_idx
  on public.letters(recipient_id, status);

-- ----------------------------------------------------------------------------
-- letter_contents — the words. 1:1 with letters, split purely so that RLS
-- can hide it while the parent row stays visible.
-- ----------------------------------------------------------------------------
create table if not exists public.letter_contents (
  letter_id  uuid primary key references public.letters(id) on delete cascade,
  couple_id  uuid not null references public.couples(id) on delete cascade,
  body       text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------
drop trigger if exists letters_set_updated_at on public.letters;
create trigger letters_set_updated_at
  before update on public.letters
  for each row execute function public.set_updated_at();

drop trigger if exists letter_contents_set_updated_at on public.letter_contents;
create trigger letter_contents_set_updated_at
  before update on public.letter_contents
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Eligibility
-- ============================================================================

/**
 * Is this letter allowed to be opened right now?
 *
 * Pure function of the row — no auth checks, no side effects — so it can be
 * used by the open function, by policies, and by the UI to decide whether to
 * show an "open it" button, all agreeing on one definition.
 */
create or replace function public.letter_is_unlockable(p_letter public.letters)
returns boolean
language sql
immutable
as $$
  select
    p_letter.status = 'sealed'
    and (
      (p_letter.unlock_trigger = 'on_request')
      or (p_letter.unlock_trigger = 'date' and p_letter.unlock_at <= now())
    )
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.letters         enable row level security;
alter table public.letter_contents enable row level security;

-- ---------- letters ----------

-- Authors see their own letters at every stage, including drafts.
drop policy if exists "author reads own letters" on public.letters;
create policy "author reads own letters"
  on public.letters for select
  using (
    couple_id = public.current_couple_id()
    and author_id = auth.uid()
  );

-- Recipients see letters addressed to them, but never while they are drafts.
-- A draft is a thing being written, and the recipient should not watch it
-- appear and disappear as the author changes their mind.
drop policy if exists "recipient reads sealed letters" on public.letters;
create policy "recipient reads sealed letters"
  on public.letters for select
  using (
    couple_id = public.current_couple_id()
    and recipient_id = auth.uid()
    and status <> 'draft'
  );

-- Authors write their own letters, to a partner in the same couple.
drop policy if exists "author writes letters" on public.letters;
create policy "author writes letters"
  on public.letters for insert
  with check (
    couple_id = public.current_couple_id()
    and author_id = auth.uid()
    and recipient_id <> auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = recipient_id
        and p.couple_id = public.current_couple_id()
    )
  );

-- Authors may edit while drafting, and may seal. They may not un-seal, and
-- they may not mark a letter opened — only open_letter() does that, and it
-- runs as definer so this policy does not constrain it.
drop policy if exists "author edits own draft" on public.letters;
create policy "author edits own draft"
  on public.letters for update
  using (
    couple_id = public.current_couple_id()
    and author_id = auth.uid()
    and status = 'draft'
  )
  with check (
    couple_id = public.current_couple_id()
    and author_id = auth.uid()
    and status in ('draft', 'sealed')
  );

-- Deleting a draft is fine. Deleting a sealed letter is not: the recipient
-- has already been told it exists and is counting down to it.
drop policy if exists "author deletes own draft" on public.letters;
create policy "author deletes own draft"
  on public.letters for delete
  using (
    couple_id = public.current_couple_id()
    and author_id = auth.uid()
    and status = 'draft'
  );

-- ---------- letter_contents ----------
--
-- This is the policy that makes the feature honest. Read it carefully.

/**
 * May the current user read this letter's body?
 *
 * SECURITY DEFINER so the lookup against `letters` is not itself filtered by
 * the policies above — the check needs to see the true row, not the caller's
 * filtered view of it, or a recipient would be evaluated against a row they
 * can only partly see.
 */
create or replace function public.can_read_letter_body(p_letter_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.letters l
    where l.id = p_letter_id
      and l.couple_id = public.current_couple_id()
      and (
        -- The author can always read what they wrote.
        l.author_id = auth.uid()
        -- The recipient can read it only once it has actually been opened.
        or (l.recipient_id = auth.uid() and l.opened_at is not null)
      )
  )
$$;

drop policy if exists "read letter body when permitted" on public.letter_contents;
create policy "read letter body when permitted"
  on public.letter_contents for select
  using (public.can_read_letter_body(letter_id));

-- Only the author, and only while the letter is still a draft.
drop policy if exists "author writes letter body" on public.letter_contents;
create policy "author writes letter body"
  on public.letter_contents for insert
  with check (
    couple_id = public.current_couple_id()
    and exists (
      select 1 from public.letters l
      where l.id = letter_id
        and l.author_id = auth.uid()
        and l.status = 'draft'
    )
  );

drop policy if exists "author edits letter body" on public.letter_contents;
create policy "author edits letter body"
  on public.letter_contents for update
  using (
    couple_id = public.current_couple_id()
    and exists (
      select 1 from public.letters l
      where l.id = letter_id
        and l.author_id = auth.uid()
        and l.status = 'draft'
    )
  )
  with check (couple_id = public.current_couple_id());

-- ============================================================================
-- Opening
-- ============================================================================

/**
 * Breaks the seal.
 *
 * The only way a letter becomes readable by its recipient. Runs as definer
 * because it must write a row the caller has no UPDATE policy on — that
 * asymmetry is the point. Every rejection raises rather than returning
 * quietly, so a caller cannot mistake "not allowed" for "nothing happened".
 */
create or replace function public.open_letter(p_letter_id uuid)
returns public.letters
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_letter public.letters;
begin
  -- Lock the row so two taps can't both pass the checks and race.
  select * into v_letter
  from public.letters
  where id = p_letter_id
  for update;

  if not found then
    raise exception 'Letter not found' using errcode = 'no_data_found';
  end if;

  if v_letter.couple_id is distinct from public.current_couple_id() then
    -- Same message as "not found": whether a letter exists in someone
    -- else's couple is not information this caller should get.
    raise exception 'Letter not found' using errcode = 'no_data_found';
  end if;

  if v_letter.recipient_id is distinct from auth.uid() then
    raise exception 'Only the recipient can open this letter'
      using errcode = 'insufficient_privilege';
  end if;

  if v_letter.status = 'opened' then
    -- Already open. Idempotent, and opened_at keeps its original value so
    -- re-reading never rewrites the moment it was first opened.
    return v_letter;
  end if;

  if not public.letter_is_unlockable(v_letter) then
    raise exception 'This letter is not ready to be opened yet'
      using errcode = 'check_violation';
  end if;

  update public.letters
  set status = 'opened',
      opened_at = now()
  where id = p_letter_id
  returning * into v_letter;

  return v_letter;
end;
$$;

-- The function is the door; everyone signed in may knock. It does its own
-- authorisation internally, which is why it can be granted broadly.
grant execute on function public.open_letter(uuid) to authenticated;
grant execute on function public.letter_is_unlockable(public.letters) to authenticated;

-- can_read_letter_body is only called from inside the policy above, but it is
-- granted anyway, and on purpose.
--
-- RLS policy expressions are evaluated as the querying user, so `authenticated`
-- needs EXECUTE or every read of letter_contents would fail with "permission
-- denied for function" rather than returning no rows. Exposing it costs
-- nothing: it answers one question — "may *you* read this?" — about the
-- caller themselves, and returns a boolean either way.
grant execute on function public.can_read_letter_body(uuid) to authenticated;

-- ============================================================================
-- Grants
--
-- Stated explicitly rather than relying on Supabase's default privileges, so
-- the tables' reachability is visible in the same file as the policies that
-- constrain it.
--
-- UPDATE on `letters` looks alarming next to everything said above, but the
-- author's draft policy needs it and RLS is what narrows it: the recipient
-- has no UPDATE policy, so an update from them matches zero rows and changes
-- nothing. `0005_letters_test.sql` asserts exactly that.
-- ============================================================================
grant select, insert, update, delete on public.letters         to authenticated;
grant select, insert, update          on public.letter_contents to authenticated;


-- ####################  0006_milestones.sql  ####################

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


-- ####################  0007_memory_detail.sql  ####################

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
alter table public.memories
  add column if not exists cover_media_id uuid
    references public.memory_media(id) on delete set null;

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


-- ####################  0008_couple_profile.sql  ####################

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


-- ####################  0009_nudges.sql  ####################

-- ============================================================================
-- Nudges — one-tap affection
--
-- The smallest possible version of the communication system: a single tap
-- that says "thinking of you", and a single tap back. No threads, no typing
-- indicators, no read receipts, no drafts.
--
-- That restraint is the design, not a shortcut. A chat feature competes with
-- the messaging app the couple already uses and loses; this does something
-- their messaging app doesn't, which is to sit on the one screen that is
-- about the two of them.
--
-- WHAT THIS IS NOT: a delivery mechanism. There are no push notifications
-- here, so a nudge is seen when the partner next opens the app. That is the
-- honest shape of the feature as built, and the UI says "they'll see it next
-- time they're here" rather than implying it buzzed in their pocket.
-- ============================================================================

create table if not exists public.nudges (
  id          uuid primary key default gen_random_uuid(),
  couple_id   uuid not null references public.couples(id) on delete cascade,
  from_id     uuid not null references public.profiles(id) on delete cascade,
  to_id       uuid not null references public.profiles(id) on delete cascade,

  -- Kept as text with a check rather than an enum: adding a kind should be a
  -- one-line migration, and the set will churn while the tone settles.
  kind        text not null
                check (kind in ('kiss', 'thinking', 'hug', 'miss_you', 'proud')),

  -- An echo is a nudge sent straight back at another one. Modelled as a
  -- normal nudge with a pointer rather than a flag on the original, so the
  -- back-and-forth is a chain you could render later if it's worth it.
  in_reply_to uuid references public.nudges(id) on delete set null,

  -- When the recipient actually laid eyes on it. Drives "new since you were
  -- last here" without needing a separate read-state table.
  seen_at     timestamptz,

  created_at  timestamptz not null default now(),

  constraint nudges_not_self check (from_id <> to_id)
);

-- The only query that matters: what has come in for me, newest first.
create index if not exists nudges_recipient_idx
  on public.nudges(to_id, created_at desc);

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.nudges enable row level security;

-- Both people see the whole exchange — a nudge you sent is as much part of
-- it as one you received.
drop policy if exists "read own nudges" on public.nudges;
create policy "read own nudges"
  on public.nudges for select
  using (couple_id = public.current_couple_id());

drop policy if exists "send nudges" on public.nudges;
create policy "send nudges"
  on public.nudges for insert
  with check (
    couple_id = public.current_couple_id()
    and from_id = auth.uid()
    and to_id <> auth.uid()
  );

-- Only the recipient marks one seen, and that is the only thing anyone may
-- change. There is no update path for the text or the kind: a nudge is a
-- gesture that happened, and an editable gesture is a strange object.
drop policy if exists "recipient marks seen" on public.nudges;
create policy "recipient marks seen"
  on public.nudges for update
  using (
    couple_id = public.current_couple_id()
    and to_id = auth.uid()
  )
  with check (
    couple_id = public.current_couple_id()
    and to_id = auth.uid()
  );

grant select, insert, update on public.nudges to authenticated;


-- ####################  0010_long_distance.sql  ####################

-- ============================================================================
-- Long-distance mode
--
-- Co-located is the default and stays the default: it is what most couples
-- are, and what this app was built for. Long distance is a mode that switches
-- on and changes what the app asks for and offers.
--
-- ON INFERENCE. docs/vision.md records the intention that this be "largely
-- inferable from the two profiles' locations rather than asked". That was
-- optimistic. Locations are free text — "Penrith" and "Penrith, NSW" are the
-- same place and compare as different, while "Springfield" and "Springfield"
-- are frequently not. Working out real distance needs geocoding, which is a
-- paid dependency the triage already put in build-later.
--
-- So the honest version: differing location text *suggests* the mode, and a
-- person decides. `auto` means nobody has answered yet, which is why it is
-- distinct from `together` rather than folded into it.
-- ============================================================================

alter table public.couples
  add column if not exists distance_mode text not null default 'auto'
    check (distance_mode in ('auto', 'together', 'apart'));

-- The next date they are in the same place. Drives the countdown that does
-- the emotional work the heartbeat-sync screens were reaching for, without
-- needing a wearable.
alter table public.couples
  add column if not exists reunion_on date;

-- IANA zone, e.g. "Australia/Sydney".
--
-- Stored rather than derived: it comes from the browser, which knows it
-- exactly, and guessing it from a free-text town would be a worse answer to
-- a question we can simply have asked correctly once.
alter table public.profiles
  add column if not exists timezone text;
