-- ============================================================================
-- The date lifecycle
--
--   idea ──▶ planned ──▶ live ──▶ done ──▶ (a memory)
--              │  ▲        │
--              │  └─ reschedule
--              └────────────▶ cancelled
--
-- Until now `date_plans` had scheduled_for, pickup_time, pickup_by, roles,
-- notes and a three-value status — and nothing in the app ever wrote any of
-- them. Every saved idea sat at 'saved' forever, so the app knew what you
-- might do and what you had photographed, with nothing in between.
--
-- THE IDEA WORTH KEEPING. A live date collects rather than displays. While
-- it is running the only thing on offer is a way to drop a photo or a line
-- of text; ending it hands that back as a draft memory. Most dates never
-- become memories because remembering afterwards is work, and this moves the
-- work into the moment where it costs nothing.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Status
--
-- 'completed' becomes 'done' and two states are added. Existing rows are
-- migrated before the constraint changes, so this is safe on a live database.
-- ----------------------------------------------------------------------------
alter table public.date_plans
  drop constraint if exists date_plans_status_check;

update public.date_plans set status = 'done' where status = 'completed';

alter table public.date_plans
  add constraint date_plans_status_check
  check (status in ('saved', 'planned', 'live', 'done', 'cancelled'));

-- ----------------------------------------------------------------------------
-- Scheduling
-- ----------------------------------------------------------------------------

-- `scheduled_for` (a date) already exists. Time is separate and nullable on
-- purpose: "Saturday evening" is a real answer, and forcing a timestamp
-- would make the app invent a precision the couple hasn't agreed on.
alter table public.date_plans
  add column if not exists scheduled_time time;

-- Counted rather than logged. A full reschedule history is the sort of thing
-- that sounds useful and then sits unread; a count is enough to say "third
-- time we've moved this" if that ever becomes worth saying.
alter table public.date_plans
  add column if not exists reschedule_count int not null default 0;

alter table public.date_plans
  add column if not exists cancelled_at timestamptz;

-- Optional and free text. Useful to the couple, never shown as a judgement.
alter table public.date_plans
  add column if not exists cancel_reason text;

-- ----------------------------------------------------------------------------
-- Running it
--
-- Recorded, not asked for: the point of a start button is that the app knows
-- when the evening actually began without anyone typing it in.
-- ----------------------------------------------------------------------------
alter table public.date_plans
  add column if not exists started_at timestamptz;

alter table public.date_plans
  add column if not exists ended_at timestamptz;

-- The memory this date turned into, once it has.
alter table public.date_plans
  add column if not exists memory_id uuid
    references public.memories(id) on delete set null;

-- Upcoming dates are read on every dashboard load; everything else is rare.
create index if not exists date_plans_upcoming_idx
  on public.date_plans(couple_id, scheduled_for)
  where status in ('planned', 'live');

-- ----------------------------------------------------------------------------
-- date_moments — what gets captured while a date is running
--
-- A note or a photo, stamped with when it happened. These become the memory
-- when the date ends, which is why they are a separate table rather than
-- fields on the plan: there can be many, they arrive over hours, and they
-- outlive the plan by being copied into the memory.
-- ----------------------------------------------------------------------------
create table if not exists public.date_moments (
  id           uuid primary key default gen_random_uuid(),
  date_plan_id uuid not null references public.date_plans(id) on delete cascade,
  couple_id    uuid not null references public.couples(id) on delete cascade,
  created_by   uuid references public.profiles(id) on delete set null,

  -- One or both. A photo with a caption is one moment, not two.
  note         text,
  storage_path text,
  media_type   text check (media_type in ('image', 'video')),

  created_at   timestamptz not null default now(),

  -- A moment with neither a note nor a photo is nothing at all.
  constraint date_moments_not_empty check (
    note is not null or storage_path is not null
  )
);

create index if not exists date_moments_plan_idx
  on public.date_moments(date_plan_id, created_at);

alter table public.date_moments enable row level security;

drop policy if exists "read couple moments" on public.date_moments;
create policy "read couple moments"
  on public.date_moments for select
  using (couple_id = public.current_couple_id());

drop policy if exists "add couple moments" on public.date_moments;
create policy "add couple moments"
  on public.date_moments for insert
  with check (couple_id = public.current_couple_id());

-- Either of you can remove a moment: you are both standing there, and a
-- blurry photo taken by one of you is not the other's to be stuck with.
drop policy if exists "remove couple moments" on public.date_moments;
create policy "remove couple moments"
  on public.date_moments for delete
  using (couple_id = public.current_couple_id());

grant select, insert, delete on public.date_moments to authenticated;

-- ============================================================================
-- Transitions
--
-- Each is a function rather than a bare update, so the rules about which
-- state can follow which live in one place. A client that could set `status`
-- freely would eventually produce a date that ended before it started.
-- ============================================================================

/**
 * Turns an idea into a plan, or moves an existing one.
 *
 * Rescheduling and first-time scheduling are the same operation with one
 * difference — the count. Splitting them into two functions would mean two
 * copies of the same validation.
 */
create or replace function public.schedule_date(
  p_plan_id uuid,
  p_date date,
  p_time time default null
)
returns public.date_plans
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_plan public.date_plans;
begin
  select * into v_plan from public.date_plans where id = p_plan_id for update;

  if not found or v_plan.couple_id is distinct from public.current_couple_id() then
    raise exception 'Date not found' using errcode = 'no_data_found';
  end if;

  if v_plan.status not in ('saved', 'planned', 'cancelled') then
    raise exception 'This date has already started'
      using errcode = 'check_violation';
  end if;

  update public.date_plans
  set scheduled_for = p_date,
      scheduled_time = p_time,
      status = 'planned',
      -- Only counts as a reschedule if it was already on a different day.
      reschedule_count = reschedule_count
        + case
            when v_plan.status = 'planned'
              and v_plan.scheduled_for is distinct from p_date
            then 1 else 0
          end,
      -- Scheduling a cancelled date un-cancels it.
      cancelled_at = null,
      cancel_reason = null
  where id = p_plan_id
  returning * into v_plan;

  return v_plan;
end;
$$;

/**
 * Calls it off.
 *
 * The plan is kept rather than deleted — a cancelled date is still something
 * that was looked forward to, and deleting it loses the reason it moved.
 * It can be scheduled again later.
 */
create or replace function public.cancel_date(
  p_plan_id uuid,
  p_reason text default null
)
returns public.date_plans
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_plan public.date_plans;
begin
  select * into v_plan from public.date_plans where id = p_plan_id for update;

  if not found or v_plan.couple_id is distinct from public.current_couple_id() then
    raise exception 'Date not found' using errcode = 'no_data_found';
  end if;

  if v_plan.status = 'done' then
    raise exception 'This date already happened'
      using errcode = 'check_violation';
  end if;

  update public.date_plans
  set status = 'cancelled',
      cancelled_at = now(),
      cancel_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      started_at = null
  where id = p_plan_id
  returning * into v_plan;

  return v_plan;
end;
$$;

/**
 * Starts the evening.
 *
 * `started_at` is now() rather than anything the couple types — the whole
 * point of a start button is that the app records when it actually began.
 *
 * Only one date runs at a time. Two live dates would make "add this photo to
 * the date" ambiguous, and there is no real situation where a couple is on
 * two dates at once.
 */
create or replace function public.start_date(p_plan_id uuid)
returns public.date_plans
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_plan public.date_plans;
begin
  select * into v_plan from public.date_plans where id = p_plan_id for update;

  if not found or v_plan.couple_id is distinct from public.current_couple_id() then
    raise exception 'Date not found' using errcode = 'no_data_found';
  end if;

  if v_plan.status = 'live' then
    return v_plan;  -- Already running. Idempotent, and keeps the first time.
  end if;

  if v_plan.status = 'done' then
    raise exception 'This date already happened'
      using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from public.date_plans
    where couple_id = v_plan.couple_id
      and status = 'live'
      and id <> p_plan_id
  ) then
    raise exception 'Another date is already running'
      using errcode = 'check_violation';
  end if;

  update public.date_plans
  set status = 'live',
      started_at = now(),
      -- Starting an unscheduled date is allowed and dates it today, because
      -- plans change and a spontaneous evening should not be blocked by
      -- paperwork.
      scheduled_for = coalesce(scheduled_for, current_date),
      cancelled_at = null,
      cancel_reason = null
  where id = p_plan_id
  returning * into v_plan;

  return v_plan;
end;
$$;

/**
 * Ends it.
 *
 * Deliberately does NOT create the memory. An abandoned date that someone
 * ended out of tidiness would leave a junk memory behind, and a memory
 * nobody chose is worse than none. The app offers one, already filled in
 * from what was captured, and a person decides.
 */
create or replace function public.end_date(p_plan_id uuid)
returns public.date_plans
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_plan public.date_plans;
begin
  select * into v_plan from public.date_plans where id = p_plan_id for update;

  if not found or v_plan.couple_id is distinct from public.current_couple_id() then
    raise exception 'Date not found' using errcode = 'no_data_found';
  end if;

  if v_plan.status <> 'live' then
    raise exception 'That date is not running'
      using errcode = 'check_violation';
  end if;

  update public.date_plans
  set status = 'done',
      ended_at = now()
  where id = p_plan_id
  returning * into v_plan;

  return v_plan;
end;
$$;

grant execute on function public.schedule_date(uuid, date, time) to authenticated;
grant execute on function public.cancel_date(uuid, text)         to authenticated;
grant execute on function public.start_date(uuid)                to authenticated;
grant execute on function public.end_date(uuid)                  to authenticated;

-- The app still updates roles, notes and the memory link directly; 0001's
-- "update couple dates" policy covers those. Status is the part that only
-- moves through the functions above.
