create extension if not exists pgcrypto;

create table if not exists public.business_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null,
  business_name text not null,
  solution_mode text not null check (
    solution_mode in ('service_business_missed_call_recovery', 'call_performance_revenue_recovery')
  ),
  business_vertical text not null check (
    business_vertical in ('hvac', 'plumbing', 'electrical', 'dental', 'cosmetic_clinic', 'legal_intake', 'call_centre', 'other')
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  caller_name text not null,
  caller_phone text,
  direction text not null default 'inbound' check (direction in ('inbound', 'outbound')),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer generated always as (
    case
      when ended_at is not null then greatest(extract(epoch from (ended_at - started_at))::integer, 0)
      else null
    end
  ) stored,
  audio_url text,
  recording_filename text,
  source_system text,
  assigned_owner text,
  status text not null default 'action_required' check (
    status in ('uploaded', 'processing', 'analyzed', 'failed', 'action_required', 'under_review', 'resolved', 'escalated')
  ),
  revenue_estimate numeric(12,2) not null default 0,
  currency_code text not null default 'GBP',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transcripts (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null references public.calls(id) on delete cascade,
  transcript_text text not null,
  transcript_source text default 'system',
  language_code text default 'en',
  confidence_score numeric(5,2),
  version integer not null default 1,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (call_id, version)
);

create table if not exists public.analysis (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null unique references public.calls(id) on delete cascade,
  transcript_id uuid references public.transcripts(id) on delete set null,
  analysis_status text not null default 'pending' check (
    analysis_status in ('pending', 'processing', 'completed', 'failed')
  ),
  failure_type text check (
    failure_type in (
      'unconverted_high_intent_lead',
      'response_sla_breach',
      'missed_booking_failure',
      'resolved_recovery_case'
    )
  ),
  conversion_failure_detected boolean not null default false,
  no_booking_attempt boolean not null default false,
  no_callback_logged boolean not null default false,
  response_sla_breach boolean not null default false,
  lead_intent_level text check (
    lead_intent_level in ('low', 'medium', 'high')
  ),
  intent_level text check (
    intent_level in ('high', 'medium', 'low')
  ),
  call_outcome text check (
    call_outcome in ('converted', 'not_converted', 'unclear')
  ),
  revenue_estimate numeric(12,2),
  primary_issue text,
  missed_opportunity boolean,
  recommended_action text,
  summary text,
  analyst_note text,
  revenue_impact_estimate numeric(12,2) not null default 0,
  resolved_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists business_memberships_business_id_idx on public.business_memberships(business_id);
create index if not exists calls_started_at_idx on public.calls(started_at desc);
create index if not exists calls_status_idx on public.calls(status);
create index if not exists transcripts_call_id_idx on public.transcripts(call_id);
create index if not exists analysis_call_id_idx on public.analysis(call_id);
create index if not exists analysis_status_idx on public.analysis(analysis_status);
create index if not exists analysis_failure_type_idx on public.analysis(failure_type);

alter table public.business_memberships enable row level security;

grant select on public.business_memberships to authenticated;
revoke insert, update, delete on public.business_memberships from authenticated, anon;

drop policy if exists "Users can read their own business membership" on public.business_memberships;
create policy "Users can read their own business membership"
on public.business_memberships
for select
to authenticated
using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_calls_updated_at on public.calls;
create trigger set_calls_updated_at
before update on public.calls
for each row
execute function public.set_updated_at();

drop trigger if exists set_business_memberships_updated_at on public.business_memberships;
create trigger set_business_memberships_updated_at
before update on public.business_memberships
for each row
execute function public.set_updated_at();

drop trigger if exists set_transcripts_updated_at on public.transcripts;
create trigger set_transcripts_updated_at
before update on public.transcripts
for each row
execute function public.set_updated_at();

drop trigger if exists set_analysis_updated_at on public.analysis;
create trigger set_analysis_updated_at
before update on public.analysis
for each row
execute function public.set_updated_at();
