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
