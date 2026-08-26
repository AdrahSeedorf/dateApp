-- ============================================================================
-- Hidden Truths V2 — foundation schema
--
-- Design notes:
--   * Everything is scoped to a `couple_id` from day one. Supporting many
--     couples later is a signup change, not a rewrite.
--   * Row Level Security is ON for every table. Without it, anyone holding
--     the public anon key could read all rows. The policies below are the
--     actual security boundary of this app.
--   * `invites` is deliberately NOT readable by anon/authenticated clients.
--     Redeeming an invite happens server-side with the service role key.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- couples
-- ----------------------------------------------------------------------------
create table public.couples (
  id          uuid primary key default gen_random_uuid(),
  name        text,
  -- Relationship start date. This is the source of truth for the
  -- "together for N days" counter that V1 kept in localStorage.
  started_at  date,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- profiles  (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  couple_id    uuid references public.couples(id) on delete set null,
  display_name text,
  created_at   timestamptz not null default now()
);

create index profiles_couple_id_idx on public.profiles(couple_id);

-- ----------------------------------------------------------------------------
-- invites  (single-use tokens; how she gets from V1 into V2)
-- ----------------------------------------------------------------------------
create table public.invites (
  token        text primary key,
  couple_id    uuid not null references public.couples(id) on delete cascade,
  email        text,
  display_name text,
  used_at      timestamptz,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- date_plans  (saved generated date ideas + real logistics)
-- ----------------------------------------------------------------------------
create table public.date_plans (
  id              uuid primary key default gen_random_uuid(),
  couple_id       uuid not null references public.couples(id) on delete cascade,
  created_by      uuid references public.profiles(id) on delete set null,

  title           text not null,
  activity        text,
  location_type   text,
  budget_estimate text,
  outfit_note     text,
  vibe_note       text,

  -- logistics (blank by default; filled in by a person, never by the model)
  pickup_time     text,
  pickup_by       text,
  roles           jsonb not null default '[]'::jsonb,
  notes           text,

  scheduled_for   date,
  status          text not null default 'saved'
                    check (status in ('saved', 'planned', 'completed')),
  created_at      timestamptz not null default now()
);

create index date_plans_couple_id_idx on public.date_plans(couple_id, created_at desc);

-- ----------------------------------------------------------------------------
-- memories
--
-- `date_plan_id` is nullable on purpose: a memory can come from a generated
-- date, or can be entirely standalone (first ice cream, a random Tuesday).
-- ----------------------------------------------------------------------------
create table public.memories (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples(id) on delete cascade,
  created_by   uuid references public.profiles(id) on delete set null,
  date_plan_id uuid references public.date_plans(id) on delete set null,

  title        text not null,
  description  text,
  memory_date  date,
  location     text,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index memories_couple_id_idx on public.memories(couple_id, memory_date desc);

-- ----------------------------------------------------------------------------
-- memory_media
--
-- couple_id is denormalised here so storage/RLS checks never need a join.
-- ----------------------------------------------------------------------------
create table public.memory_media (
  id           uuid primary key default gen_random_uuid(),
  memory_id    uuid not null references public.memories(id) on delete cascade,
  couple_id    uuid not null references public.couples(id) on delete cascade,
  storage_path text not null,
  media_type   text not null check (media_type in ('image', 'video')),
  created_at   timestamptz not null default now()
);

create index memory_media_memory_id_idx on public.memory_media(memory_id);

-- ----------------------------------------------------------------------------
-- updated_at trigger
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger memories_set_updated_at
  before update on public.memories
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- Resolves the couple of the currently signed-in user.
-- SECURITY DEFINER so it can read profiles without recursing through RLS.
create or replace function public.current_couple_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select couple_id from public.profiles where id = auth.uid()
$$;

alter table public.couples      enable row level security;
alter table public.profiles     enable row level security;
alter table public.invites      enable row level security;
alter table public.date_plans   enable row level security;
alter table public.memories     enable row level security;
alter table public.memory_media enable row level security;

-- ---------- couples ----------
create policy "read own couple"
  on public.couples for select
  using (id = public.current_couple_id());

create policy "update own couple"
  on public.couples for update
  using (id = public.current_couple_id())
  with check (id = public.current_couple_id());

-- ---------- profiles ----------
-- You can see yourself and your partner (same couple).
create policy "read profiles in own couple"
  on public.profiles for select
  using (
    id = auth.uid()
    or (couple_id is not null and couple_id = public.current_couple_id())
  );

create policy "insert own profile"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- invites ----------
-- No policies on purpose. RLS is enabled and nothing is permitted, so the
-- anon/authenticated clients can never read or write invite tokens. Only the
-- service role (which bypasses RLS) may touch this table, from the server.

-- ---------- date_plans ----------
create policy "read couple date plans"
  on public.date_plans for select
  using (couple_id = public.current_couple_id());

create policy "insert couple date plans"
  on public.date_plans for insert
  with check (couple_id = public.current_couple_id());

create policy "update couple date plans"
  on public.date_plans for update
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

create policy "delete couple date plans"
  on public.date_plans for delete
  using (couple_id = public.current_couple_id());

-- ---------- memories ----------
create policy "read couple memories"
  on public.memories for select
  using (couple_id = public.current_couple_id());

create policy "insert couple memories"
  on public.memories for insert
  with check (couple_id = public.current_couple_id());

create policy "update couple memories"
  on public.memories for update
  using (couple_id = public.current_couple_id())
  with check (couple_id = public.current_couple_id());

create policy "delete couple memories"
  on public.memories for delete
  using (couple_id = public.current_couple_id());

-- ---------- memory_media ----------
create policy "read couple media"
  on public.memory_media for select
  using (couple_id = public.current_couple_id());

create policy "insert couple media"
  on public.memory_media for insert
  with check (couple_id = public.current_couple_id());

create policy "delete couple media"
  on public.memory_media for delete
  using (couple_id = public.current_couple_id());

-- ============================================================================
-- Storage
--
-- Private bucket. Files are laid out as:  {couple_id}/{memory_id}/{filename}
-- so the first path segment is the security check.
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('memory-media', 'memory-media', false)
on conflict (id) do nothing;

create policy "couple can read own media"
  on storage.objects for select
  using (
    bucket_id = 'memory-media'
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );

create policy "couple can upload own media"
  on storage.objects for insert
  with check (
    bucket_id = 'memory-media'
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );

create policy "couple can delete own media"
  on storage.objects for delete
  using (
    bucket_id = 'memory-media'
    and (storage.foldername(name))[1] = public.current_couple_id()::text
  );
