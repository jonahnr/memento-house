create table if not exists public.system_health_runs(
 id uuid primary key default gen_random_uuid(),
 status text not null check(status in ('healthy','degraded','failed')),
 checks jsonb not null default '[]'::jsonb,
 source text not null default 'scheduled',
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.system_health_runs enable row level security;
revoke all on public.system_health_runs from anon,authenticated;
create index if not exists system_health_runs_created_at_idx on public.system_health_runs(created_at desc);
