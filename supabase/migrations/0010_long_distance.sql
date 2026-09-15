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
