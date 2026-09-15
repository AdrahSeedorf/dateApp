-- ============================================================================
-- Which migrations has this database actually had?
--
-- There is no migrations table — everything has been applied by hand in the
-- SQL editor — so this infers it from what exists. Run it any time the app
-- complains that a column or relation is missing.
-- ============================================================================

select
  m.n           as "migration",
  m.what        as "adds",
  case when m.present then '✅ applied' else '❌ MISSING' end as "status"
from (
  values
    ('0001', 'core tables',
      to_regclass('public.couples') is not null),
    ('0002', 'profile_prefs, onboarding columns',
      to_regclass('public.profile_prefs') is not null),
    ('0003', 'couples insert policy',
      exists (select 1 from pg_policies
              where tablename = 'couples' and policyname = 'create a couple')),
    ('0004', 'profiles.onboarding_path',
      exists (select 1 from information_schema.columns
              where table_name = 'profiles' and column_name = 'onboarding_path')),
    ('0005', 'letters + time lock',
      to_regclass('public.letters') is not null),
    ('0006', 'milestones',
      to_regclass('public.milestones') is not null),
    ('0007', 'memory categories + reflections',
      to_regclass('public.memory_reflections') is not null),
    ('0008', 'couple stage, theme, cover',
      exists (select 1 from information_schema.columns
              where table_name = 'couples' and column_name = 'stage')),
    ('0009', 'nudges',
      to_regclass('public.nudges') is not null),
    ('0010', 'long-distance mode',
      exists (select 1 from information_schema.columns
              where table_name = 'couples' and column_name = 'distance_mode')),
    ('0011', 'cover flag on media, no circular FK',
      exists (select 1 from information_schema.columns
              where table_name = 'memory_media' and column_name = 'is_cover')
      and not exists (select 1 from information_schema.columns
              where table_name = 'memories' and column_name = 'cover_media_id'))
) as m(n, what, present)
order by m.n;
