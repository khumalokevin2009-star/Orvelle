begin;

create table if not exists public.business_memberships (
  user_id uuid references auth.users(id) on delete cascade,
  business_id uuid,
  business_name text,
  solution_mode text,
  business_vertical text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.business_memberships
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists business_id uuid,
  add column if not exists business_name text,
  add column if not exists solution_mode text,
  add column if not exists business_vertical text,
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create unique index if not exists business_memberships_user_id_idx
  on public.business_memberships(user_id);

create index if not exists business_memberships_business_id_idx
  on public.business_memberships(business_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_memberships_solution_mode_check'
      and conrelid = 'public.business_memberships'::regclass
  ) then
    alter table public.business_memberships
      add constraint business_memberships_solution_mode_check
      check (
        solution_mode in (
          'service_business_missed_call_recovery',
          'call_performance_revenue_recovery'
        )
      ) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_memberships_business_vertical_check'
      and conrelid = 'public.business_memberships'::regclass
  ) then
    alter table public.business_memberships
      add constraint business_memberships_business_vertical_check
      check (
        business_vertical in (
          'hvac',
          'plumbing',
          'electrical',
          'dental',
          'cosmetic_clinic',
          'legal_intake',
          'call_centre',
          'other'
        )
      ) not valid;
  end if;
end
$$;

create or replace function public.set_business_memberships_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_business_memberships_updated_at on public.business_memberships;

create trigger set_business_memberships_updated_at
before update on public.business_memberships
for each row
execute function public.set_business_memberships_updated_at();

alter table public.business_memberships enable row level security;

grant select on public.business_memberships to authenticated;
revoke insert, update, delete on public.business_memberships from authenticated, anon;

drop policy if exists "Users can read their own business membership" on public.business_memberships;

create policy "Users can read their own business membership"
on public.business_memberships
for select
to authenticated
using (auth.uid() = user_id);

commit;
