-- ============================================================================
-- Tests for the letter time-lock (migration 0005).
--
-- The feature makes one promise — the recipient cannot read a letter before
-- it opens — and that promise is only worth anything if it survives someone
-- calling the API directly rather than using the app. These tests act as
-- real signed-in users against real policies to check that it does.
--
-- HOW TO RUN
--   Paste the whole file into the Supabase SQL editor and execute it.
--   It ends in ROLLBACK, so it leaves nothing behind.
--
--   Success is a single row reading "ALL 19 TESTS PASSED". Any failure
--   raises and aborts the transaction, so you get a red error naming the
--   check instead. There is no quiet failure and no third outcome.
--
-- HOW IT WORKS
--   Supabase derives auth.uid() from the `request.jwt.claims` setting, so
--   impersonating a user is a matter of setting that and switching to the
--   `authenticated` role. Between acts we reset to the owning role.
--
--   Each act begins by asserting it really is restricted — RLS does not
--   apply to owners, so a failed switch would make these tests vacuous.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------

-- Assertions raise on failure, which aborts the whole transaction. So there
-- are only two possible outcomes: a red error naming the failed check, or
-- the final SELECT below. Reaching the end *is* the pass.
--
-- Per-check detail goes to RAISE NOTICE, which psql shows and the Supabase
-- SQL editor discards. That is fine: the notices are a convenience, and the
-- pass/fail signal does not depend on them.
--
-- An earlier version accumulated results in a table so the editor could
-- display every check. It was not worth it — the table turned out to be the
-- least portable part of the file, and failed twice for reasons that had
-- nothing to do with what is being tested.
create or replace function pg_temp.ok(p_condition boolean, p_what text)
returns void language plpgsql as $$
begin
  if not p_condition then
    raise exception 'FAILED: %', p_what;
  end if;
  raise notice 'pass — %', p_what;
end $$;

/**
 * Equality assertion that reports the actual value on failure.
 *
 * Worth the extra helper: a bare boolean assertion tells you a comparison
 * failed but not what was found, and here the interesting failures are
 * exactly the ones where the difference matters — null (the lock held when
 * it shouldn't have) reads very differently from the wrong string (a broken
 * fixture).
 */
create or replace function pg_temp.ok_eq(
  p_actual text, p_expected text, p_what text
) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAILED: % (expected %, got %)',
      p_what,
      coalesce(quote_literal(p_expected), 'NULL'),
      coalesce(quote_literal(p_actual), 'NULL');
  end if;
  raise notice 'pass — %', p_what;
end $$;

/**
 * Refuses to continue unless we are genuinely acting as a restricted user.
 *
 * This matters more than it looks. RLS does not apply to superusers or to
 * table owners, so a role switch that silently failed would run every
 * assertion below with full visibility. Called at the top of each act.
 */
create or replace function pg_temp.assert_restricted() returns void
language plpgsql as $$
declare v_role text; v_uid uuid;
begin
  select current_user into v_role;
  if v_role <> 'authenticated' then
    raise exception
      'FAILED: expected to be acting as authenticated, but current_user is %. '
      'RLS would be bypassed and these tests would prove nothing.', v_role;
  end if;

  v_uid := auth.uid();
  if v_uid is null then
    raise exception
      'FAILED: auth.uid() is null — request.jwt.claims was not applied.';
  end if;

  raise notice '(acting as % / %)', v_role, v_uid;
end $$;

-- ----------------------------------------------------------------------------
-- Fixtures: two couples, two people each. Ana writes to Ben.
-- ----------------------------------------------------------------------------
--   Ana  1111…  ┐ couple aaaa…
--   Ben  2222…  ┘
--   Zoe  3333…    couple bbbb…  (unrelated)
--
-- UUIDs are written out in full rather than held in variables, because psql
-- meta-commands like \set do not exist in the Supabase SQL editor.

insert into auth.users (id, email, instance_id, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'ana@test.invalid',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'ben@test.invalid',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'zoe@test.invalid',
   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into public.couples (id, name) values
  ('aaaaaaaa-1111-1111-1111-111111111111', 'Test couple'),
  ('bbbbbbbb-2222-2222-2222-222222222222', 'Unrelated couple');

insert into public.profiles (id, couple_id, display_name) values
  ('11111111-1111-1111-1111-111111111111',
   'aaaaaaaa-1111-1111-1111-111111111111', 'Ana'),
  ('22222222-2222-2222-2222-222222222222',
   'aaaaaaaa-1111-1111-1111-111111111111', 'Ben'),
  ('33333333-3333-3333-3333-333333333333',
   'bbbbbbbb-2222-2222-2222-222222222222', 'Zoe');

-- Three letters from Ana to Ben:
--   future   — dated, opens in a year
--   ready    — dated, unlock time already passed
--   anytime  — on_request ("open on a tough day")
-- Plus one still being written.
insert into public.letters
  (id, couple_id, author_id, recipient_id, title, status,
   unlock_trigger, unlock_at, sealed_at)
values
  ('ffff0001-0000-0000-0000-000000000001',
   'aaaaaaaa-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   'Open on our anniversary', 'sealed', 'date', now() + interval '1 year', now()),
  ('ffff0002-0000-0000-0000-000000000002',
   'aaaaaaaa-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   'Already due', 'sealed', 'date', now() - interval '1 day', now()),
  ('ffff0003-0000-0000-0000-000000000003',
   'aaaaaaaa-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   'Open on a tough day', 'sealed', 'on_request', null, now()),
  ('ffff0004-0000-0000-0000-000000000004',
   'aaaaaaaa-1111-1111-1111-111111111111',
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   'Still writing this', 'draft', 'on_request', null, null);

-- Body text is derived from the id so each is distinguishable: letter
-- ffff0002-… gets 'SECRET-0002'. The discriminator starts at character 5.
insert into public.letter_contents (letter_id, couple_id, body)
select id, couple_id, 'SECRET-' || substr(id::text, 5, 4)
from public.letters;

-- ============================================================================
-- Act 1 — Ben (the recipient)
-- ============================================================================
select set_config('request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
set local role authenticated;
do $$ begin perform pg_temp.assert_restricted(); end $$;

do $$
declare v_count int; v_body text; v_rows int;
begin
  raise notice '── Recipient ──';

  -- Sees the three sealed letters, not the draft.
  select count(*) into v_count from public.letters;
  perform pg_temp.ok(v_count = 3, 'sees sealed letters but not the draft');

  select count(*) into v_count from public.letters where status = 'draft';
  perform pg_temp.ok(v_count = 0, 'cannot see a draft at all');

  -- THE CRITICAL ONE. Metadata visible, body not.
  select count(*) into v_count from public.letter_contents;
  perform pg_temp.ok(v_count = 0, 'CANNOT read any sealed body');

  select body into v_body from public.letter_contents
  where letter_id = 'ffff0001-0000-0000-0000-000000000001';
  perform pg_temp.ok(v_body is null, 'CANNOT read a specific sealed body');

  -- Cannot forge an unlock by updating the row directly. There is no UPDATE
  -- policy for recipients, so this silently matches nothing — which is the
  -- correct outcome, but worth asserting so a future policy change that
  -- accidentally grants it fails loudly here.
  update public.letters
  set unlock_at = now() - interval '1 day'
  where id = 'ffff0001-0000-0000-0000-000000000001';
  get diagnostics v_rows = row_count;
  perform pg_temp.ok(v_rows = 0, 'cannot rewrite unlock_at to open early');

  update public.letters
  set status = 'opened', opened_at = now()
  where id = 'ffff0001-0000-0000-0000-000000000001';
  get diagnostics v_rows = row_count;
  perform pg_temp.ok(v_rows = 0, 'cannot mark a letter opened directly');
end $$;

-- Opening one that is not due yet must be refused.
do $$
begin
  begin
    perform public.open_letter('ffff0001-0000-0000-0000-000000000001');
    raise exception 'FAILED: open_letter allowed a letter that is not due';
  exception
    when check_violation then
      perform pg_temp.ok(true, 'open_letter refuses a letter before its date');
  end;
end $$;

-- The due one, and the on-request one, must both open.
do $$
declare v_body text; v_first timestamptz; v_again timestamptz;
begin
  perform public.open_letter('ffff0002-0000-0000-0000-000000000002');
  perform pg_temp.ok(true, 'open_letter allows a letter past its date');

  select body into v_body from public.letter_contents
  where letter_id = 'ffff0002-0000-0000-0000-000000000002';
  perform pg_temp.ok_eq(v_body, 'SECRET-0002', 'body readable once opened');

  -- "Open on a tough day": no date, released when they ask.
  perform public.open_letter('ffff0003-0000-0000-0000-000000000003');
  select body into v_body from public.letter_contents
  where letter_id = 'ffff0003-0000-0000-0000-000000000003';
  perform pg_temp.ok_eq(v_body, 'SECRET-0003', 'on_request letter opens on demand');

  -- Re-reading must not rewrite the moment it was first opened.
  select opened_at into v_first from public.letters
  where id = 'ffff0002-0000-0000-0000-000000000002';
  perform pg_sleep(0.05);
  perform public.open_letter('ffff0002-0000-0000-0000-000000000002');
  select opened_at into v_again from public.letters
  where id = 'ffff0002-0000-0000-0000-000000000002';
  perform pg_temp.ok(v_first = v_again, 'reopening preserves the original opened_at');

  -- The still-sealed one stays sealed.
  select body into v_body from public.letter_contents
  where letter_id = 'ffff0001-0000-0000-0000-000000000001';
  perform pg_temp.ok(v_body is null, 'the undue letter is still unreadable');
end $$;

-- ============================================================================
-- Act 2 — Ana (the author)
-- ============================================================================
reset role;
select set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
set local role authenticated;
do $$ begin perform pg_temp.assert_restricted(); end $$;

do $$
declare v_count int; v_rows int;
begin
  raise notice '── Author ──';

  select count(*) into v_count from public.letter_contents;
  perform pg_temp.ok(v_count = 4, 'author can read every body they wrote');

  -- Sealing is one-way: a sealed letter's words are fixed.
  update public.letter_contents
  set body = 'rewritten after sealing'
  where letter_id = 'ffff0001-0000-0000-0000-000000000001';
  get diagnostics v_rows = row_count;
  perform pg_temp.ok(v_rows = 0, 'author cannot edit a sealed body');

  -- But a draft is still editable.
  update public.letter_contents
  set body = 'still drafting'
  where letter_id = 'ffff0004-0000-0000-0000-000000000004';
  get diagnostics v_rows = row_count;
  perform pg_temp.ok(v_rows = 1, 'author can still edit a draft body');
end $$;

-- An author opening their own letter is not the recipient breaking a seal.
do $$
begin
  begin
    perform public.open_letter('ffff0001-0000-0000-0000-000000000001');
    raise exception 'FAILED: author was allowed to open their own sealed letter';
  exception
    when insufficient_privilege then
      perform pg_temp.ok(true, 'author cannot open a letter on the recipient''s behalf');
  end;
end $$;

-- ============================================================================
-- Act 3 — an unrelated couple
-- ============================================================================
reset role;
select set_config('request.jwt.claims',
  '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
set local role authenticated;
do $$ begin perform pg_temp.assert_restricted(); end $$;

do $$
declare v_count int;
begin
  raise notice '── Outsider ──';

  select count(*) into v_count from public.letters;
  perform pg_temp.ok(v_count = 0, 'sees none of another couple''s letters');

  select count(*) into v_count from public.letter_contents;
  perform pg_temp.ok(v_count = 0, 'sees none of another couple''s bodies');
end $$;

do $$
begin
  begin
    perform public.open_letter('ffff0003-0000-0000-0000-000000000003');
    raise exception 'FAILED: an outsider opened someone else''s letter';
  exception
    when no_data_found then
      -- "Not found" rather than "forbidden": whether that id exists in
      -- another couple is not theirs to learn.
      perform pg_temp.ok(true, 'outsider is told the letter does not exist');
  end;
end $$;

reset role;

-- The last statement that returns rows, so it is what the SQL editor shows.
-- If you can read this, every check above passed.
select 'ALL 19 TESTS PASSED — the letter lock holds' as result;

rollback;
