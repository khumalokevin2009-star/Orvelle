alter table if exists public.analysis
  add column if not exists intent_level text check (intent_level in ('high', 'medium', 'low')),
  add column if not exists call_outcome text check (call_outcome in ('converted', 'not_converted', 'unclear')),
  add column if not exists revenue_estimate numeric(12,2),
  add column if not exists primary_issue text,
  add column if not exists missed_opportunity boolean;
