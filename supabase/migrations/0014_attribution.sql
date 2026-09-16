-- ============================================================================
-- Who did what
--
-- `date_plans.created_by` has existed since 0001 and has never once been
-- written to — every plan in the database has a null there. `memories` was
-- the same on two of its four insert paths. The result is an app built for
-- two people that can't tell you which of them did anything.
--
-- That matters most in the places where the answer changes how you feel
-- about the row. "Called off" reads as a system event; "Karina called this
-- off" reads as your partner telling you something. Same data, and only one
-- of them is worth showing.
--
-- Two columns are added here. Both are nullable and both stay null for
-- everything that already exists, which is correct: we don't know who did
-- those, and guessing would be worse than a blank.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- The columns
--
-- `on delete set null` throughout, matching 0001. If a profile is ever
-- removed the date survives with the name dropped, rather than the date
-- being deleted along with the person — the evening still happened.
-- ----------------------------------------------------------------------------

-- Who put it in the diary. Distinct from created_by on purpose: one of you
-- often finds the idea and the other is the one who commits to a day.
alter table public.date_plans
  add column if not exists planned_by uuid
    references public.profiles(id) on delete set null;

-- Who called it off. The single most useful piece of attribution in the
-- whole lifecycle — a cancelled date with no name on it is a mystery.
alter table public.date_plans
  add column if not exists cancelled_by uuid
    references public.profiles(id) on delete set null;

comment on column public.date_plans.created_by is
  'Who saved the idea. Null for anything created before 0014.';
comment on column public.date_plans.planned_by is
  'Who scheduled it. Set by schedule_date(), so a reschedule reassigns it.';
comment on column public.date_plans.cancelled_by is
  'Who cancelled it. Cleared when the date is scheduled again.';

-- ----------------------------------------------------------------------------
-- schedule_date — unchanged except that it now signs the plan
--
-- `auth.uid()` is read from the request's JWT claims, which `security
-- definer` does not affect: the function runs with the owner's privileges
-- but the claims still describe the caller. So this records the person who
-- pressed the button, not the database owner.
--
-- On a reschedule this overwrites the previous planner. That's the intent —
-- "Karina moved it to Saturday" is the current state of the plan, and the
-- person who chose the day that no longer applies isn't interesting.
-- ----------------------------------------------------------------------------
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
      planned_by = auth.uid(),
      -- Only counts as a reschedule if it was already on a different day.
      reschedule_count = reschedule_count
        + case
            when v_plan.status = 'planned'
              and v_plan.scheduled_for is distinct from p_date
            then 1 else 0
          end,
      -- Scheduling a cancelled date un-cancels it, and the cancellation
      -- stops being something anyone is owed an explanation for.
      cancelled_at = null,
      cancel_reason = null,
      cancelled_by = null
  where id = p_plan_id
  returning * into v_plan;

  return v_plan;
end;
$$;

-- ----------------------------------------------------------------------------
-- cancel_date — same, for the name on the cancellation
-- ----------------------------------------------------------------------------
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
      cancelled_by = auth.uid(),
      cancel_reason = nullif(btrim(coalesce(p_reason, '')), ''),
      started_at = null
  where id = p_plan_id
  returning * into v_plan;

  return v_plan;
end;
$$;

grant execute on function public.schedule_date(uuid, date, time) to authenticated;
grant execute on function public.cancel_date(uuid, text)         to authenticated;

-- ----------------------------------------------------------------------------
-- Why there's no `started_by` or `ended_by`
--
-- You are both standing there when a date starts. Recording which of you
-- reached for a phone first says nothing about the evening, and every column
-- that exists eventually gets rendered somewhere. Attribution earns its
-- place when the two people could plausibly have done different things and
-- one of them would want to know which.
-- ----------------------------------------------------------------------------
