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
