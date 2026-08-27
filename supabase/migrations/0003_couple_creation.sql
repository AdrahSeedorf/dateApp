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
