create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique,
  stripe_payment_intent_id text,
  customer_user_id uuid,
  customer_email text not null,
  customer_name text,
  product text not null,
  tier text not null,
  addons text[] not null default '{}',
  amount_total integer not null default 0,
  currency text not null default 'usd',
  payment_status text not null default 'pending',
  questionnaire_status text not null default 'not_sent',
  design_status text not null default 'awaiting_questionnaire',
  proof_status text not null default 'not_started',
  revision_count integer not null default 0,
  production_status text not null default 'not_started',
  shipping_status text not null default 'not_started',
  tracking_number text,
  entitlement_status text not null default 'pending',
  internal_notes text not null default '',
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_customer_email_idx on public.orders(lower(customer_email));
alter table public.orders enable row level security;
revoke all on public.orders from anon, authenticated;

create table if not exists public.guest_action_events (
  id bigint generated always as identity primary key,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  actor_hash text not null,
  action text not null,
  created_at timestamptz not null default now()
);

create index if not exists guest_action_window_idx on public.guest_action_events(wedding_id,actor_hash,action,created_at desc);
alter table public.guest_action_events enable row level security;
revoke all on public.guest_action_events from anon, authenticated;

create or replace function public.claim_guest_action(
  p_wedding_id uuid,
  p_actor_hash text,
  p_action text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(p_wedding_id::text || ':' || p_actor_hash || ':' || p_action, 0));
  delete from public.guest_action_events where created_at < now() - interval '30 days';
  select count(*) into v_count from public.guest_action_events
   where wedding_id=p_wedding_id and actor_hash=p_actor_hash and action=p_action
     and created_at >= now() - make_interval(secs => p_window_seconds);
  if v_count >= p_limit then return false; end if;
  insert into public.guest_action_events(wedding_id,actor_hash,action) values(p_wedding_id,p_actor_hash,p_action);
  return true;
end;
$$;
revoke all on function public.claim_guest_action(uuid,text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.claim_guest_action(uuid,text,text,integer,integer) to service_role;
